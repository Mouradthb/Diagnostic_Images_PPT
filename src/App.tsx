import { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileImage,
  Trash2,
  Play,
  Loader2,
  RefreshCw,
  Code2,
  Sparkles,
  X,
  Building2,
  LogOut,
} from 'lucide-react';
import { InspectionImageItem, DiagnosticResult } from './types';
import { fileToBase64, formatFileSize, prepareImageForAnalysis } from './utils/fileHelpers';
import { ResultCard } from './components/ResultCard';
import { LegendBar } from './components/LegendBar';
import { CodeModal } from './components/CodeModal';
import { createSampleImageFile } from './data/sampleImages';

interface AppProps {
  email: string;
  getIdToken: () => Promise<string>;
  onSignOut: () => Promise<void>;
}

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_ORIGINAL_BYTES = 20_000_000;
const MAX_REQUEST_BYTES = 4_000_000;

async function requestAnalysis(file: File, getIdToken: () => Promise<string>): Promise<DiagnosticResult> {
  const { base64Data, mimeType } = await prepareImageForAnalysis(file);
  const body = JSON.stringify({ imageBase64: base64Data, mimeType });
  if (new Blob([body]).size > MAX_REQUEST_BYTES) {
    throw new Error('Cette photo reste trop volumineuse après compression (limite de 4 Mo).');
  }

  const token = await getIdToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 70_000);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Erreur lors de l'analyse (${response.status}).`);
    }
    if (!data.niveau || !data.description_probleme || !data.remediation_proposee) {
      throw new Error('Réponse invalide : champs requis manquants.');
    }
    return data as DiagnosticResult;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Analyse trop longue. Réessayez cette photo.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export default function App({ email, getIdToken, onSignOut }: AppProps) {
  const [items, setItems] = useState<InspectionImageItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => () => {
    itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  // Ajouter des fichiers sélectionnés
  const handleAddFiles = (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList).filter((file) => ACCEPTED_TYPES.has(file.type) && file.size <= MAX_ORIGINAL_BYTES);
    setUploadError(filesArray.length === fileList.length ? '' : 'Certains fichiers ont été ignorés : seuls JPG, PNG et WEBP de 20 Mo maximum sont acceptés.');
    if (filesArray.length === 0) return;

    const newItems: InspectionImageItem[] = filesArray.map((file) => ({
      id: 'img_' + Math.random().toString(36).substring(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      fileName: file.name,
      fileSize: file.size,
      status: 'pending',
    }));

    setItems((prev) => [...prev, ...newItems]);
  };

  // Supprimer une image spécifique
  const handleRemoveItem = (id: string) => {
    if (isAnalyzing) return;
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  // Tout effacer
  const handleClearAll = () => {
    if (isAnalyzing) return;
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setUploadError('');
    setCurrentIndex(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Charger des exemples de visite technique
  const handleLoadSamples = async () => {
    if (isAnalyzing) return;
    try {
      const sample1 = await createSampleImageFile(
        'Fissure infiltrante sur façade Est',
        '#78350f',
        'Fissure verticale traversante avec traces d’humidité au niveau R+2',
        'visite_facade_fissure_01.jpg'
      );
      const sample2 = await createSampleImageFile(
        'Vase d’expansion corrodé en chaufferie',
        '#1e293b',
        'Oxydation prononcée au raccord et baisse de pression du circuit',
        'visite_chaufferie_vase_02.jpg'
      );
      const sample3 = await createSampleImageFile(
        'Éclairage palier défectueux et fils visibles',
        '#334155',
        'Boîtier de dérivation déboîté dans la cage d’escalier B',
        'visite_parties_communes_03.jpg'
      );
      handleAddFiles([sample1, sample2, sample3]);
    } catch (e) {
      console.error('Erreur chargement des exemples:', e);
    }
  };

  // Lancement du traitement séquentiel, image par image
  const handleStartAnalysis = async () => {
    if (items.length === 0 || isAnalyzing) return;

    setIsAnalyzing(true);

    // Réinitialiser les statuts pour la session d'analyse
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'pending',
        result: undefined,
        errorMessage: undefined,
      }))
    );

    // Traitement séquentiel strict : UNE image après l'autre
    for (let i = 0; i < items.length; i++) {
      setCurrentIndex(i);
      const currentItem = items[i];

      // 1. Afficher immédiatement l'état "en cours" sur la carte de cette image
      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'analyzing' } : it))
      );

      try {
        // 2. Optimisation & conversion de l'image (redimensionnement intelligent pour éviter les surcharges/503)
        const data = await requestAnalysis(currentItem.file, getIdToken);

        // 5. Affichage progressif immédiat du résultat pour cette image
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'completed',
                  result: data,
                  analyzedAt: new Date().toLocaleTimeString(),
                }
              : it
          )
        );
      } catch (error: any) {
        console.error(`Erreur d'analyse pour ${currentItem.fileName}:`, error);

        // 6. Gestion d'erreur par image : afficher sur SA carte sans bloquer les suivantes
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'error',
                  errorMessage: error?.message || 'Erreur inconnue lors du traitement de cette photo.',
                }
              : it
          )
        );
      }

      // Petite pause de temporisation entre les requêtes pour prévenir les surcharges d'API
      if (i < items.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setIsAnalyzing(false);
    setCurrentIndex(null);
  };

  // Réessayer une seule image ayant échoué
  const handleRetrySingle = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || isAnalyzing) return;

    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, status: 'analyzing', errorMessage: undefined } : it
      )
    );

    try {
      const data = await requestAnalysis(item.file, getIdToken);

      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status: 'completed',
                result: data,
                analyzedAt: new Date().toLocaleTimeString(),
              }
            : it
        )
      );
    } catch (error: any) {
      console.error(`Erreur lors du réessai pour ${item.fileName}:`, error);
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status: 'error',
                errorMessage: error?.message || 'Erreur lors du réessai.',
              }
            : it
        )
      );
    }
  };

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const isStarted = items.some((i) => i.status !== 'pending');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header principal */}
        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-1">
                  PPPT • Loi Climat & Résilience • Analyse Unitaire
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Diagnostic Technique Bâtiment
                </h1>
                <p className="text-sm text-slate-600 mt-0.5">
                  Expertise ingénieur thermiques & fluides selon la grille officielle PPPT (décret n°2022-663).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center text-xs text-slate-600">
              <span className="max-w-40 truncate" title={email}>{email}</span>
              <button type="button" onClick={() => void onSignOut()} disabled={isAnalyzing} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-50">
                <LogOut className="w-3.5 h-3.5" /> Déconnexion
              </button>
            </div>
          </div>

        </header>

        {/* Légende de la grille de hiérarchisation */}
        <LegendBar />

        {/* Section 1 : Zone d'upload multi-fichiers */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          {uploadError && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{uploadError}</p>}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                1. Sélection des photos de visite technique
              </h2>
              <p className="text-xs text-slate-500">
                Ajoutez une ou plusieurs photos à analyser. Aperçu disponible avant analyse.
              </p>
            </div>

          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!isAnalyzing) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (!isAnalyzing && e.dataTransfer.files) {
                handleAddFiles(e.dataTransfer.files);
              }
            }}
            onClick={() => {
              if (!isAnalyzing && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50/70 scale-[1.005]'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            } ${isAnalyzing ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleAddFiles(e.target.files);
                e.target.value = '';
              }}
              disabled={isAnalyzing}
            />

            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Cliquez pour choisir vos photos ou glissez-déposez-les ici
              </p>
              <p className="text-xs text-slate-400">
                Formats d'images acceptés : JPG, PNG, WEBP • Sélection multiple supportée
              </p>
            </div>
          </div>

          {/* Grille des miniatures sélectionnées avant analyse */}
          {items.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">
                    Photos sélectionnées ({items.length})
                  </span>
                  {isAnalyzing && currentIndex !== null && (
                    <span className="text-xs text-blue-600 font-semibold animate-pulse">
                      • Traitement de l'image {currentIndex + 1} / {items.length}
                    </span>
                  )}
                </div>

                {!isAnalyzing && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Effacer la sélection
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`relative rounded-lg overflow-hidden border bg-slate-50 group aspect-square flex flex-col ${
                      currentIndex === idx
                        ? 'border-blue-500 ring-2 ring-blue-400'
                        : 'border-slate-200'
                    }`}
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.fileName}
                      className="w-full h-full object-cover"
                    />

                    {/* Statut overlay */}
                    {item.status === 'analyzing' && (
                      <div className="absolute inset-0 bg-blue-900/60 flex items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    )}

                    {item.status === 'completed' && (
                      <div className="absolute top-1 left-1 bg-emerald-600 text-white rounded-full p-0.5">
                        <span className="sr-only">Terminé</span>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {item.status === 'error' && (
                      <div className="absolute top-1 left-1 bg-red-600 text-white rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </div>
                    )}

                    {!isAnalyzing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="absolute top-1 right-1 p-1 bg-slate-900/70 hover:bg-red-600 text-white rounded-full transition-colors opacity-80 hover:opacity-100"
                        title="Retirer cette photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="absolute bottom-0 inset-x-0 bg-slate-900/75 p-1 text-[10px] text-white truncate px-1.5">
                      {item.fileName} ({formatFileSize(item.fileSize)})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bouton Analyser */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500">
              {items.length === 0
                ? 'Sélectionnez au moins une photo pour activer l’analyse.'
                : `${items.length} photo${items.length > 1 ? 's' : ''} prête${items.length > 1 ? 's' : ''} pour une analyse indépendante unitaire.`}
            </div>

            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={items.length === 0 || isAnalyzing}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-sm transition-all ${
                items.length === 0 || isAnalyzing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    Analyse en cours ({currentIndex !== null ? currentIndex + 1 : 0}/{items.length})...
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Analyser {items.length > 0 ? `les ${items.length} photo${items.length > 1 ? 's' : ''}` : ''}</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Section 2 : Affichage progressif des résultats */}
        {(isStarted || items.some((i) => i.status !== 'pending')) && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  2. Résultats du diagnostic unitaire
                </h2>
                <p className="text-xs text-slate-500">
                  Chaque photo est traitée de façon totalement isolée et indépendante.
                </p>
              </div>

              <div className="text-xs font-semibold text-slate-600 flex items-center gap-3">
                {completedCount > 0 && (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                    {completedCount} analysée{completedCount > 1 ? 's' : ''}
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-red-700 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                    {errorCount} échec{errorCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Cartes de résultats progressives */}
            <div className="space-y-4">
              {items
                .filter((item) => item.status !== 'pending')
                .map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    onRetry={handleRetrySingle}
                    disabled={isAnalyzing}
                  />
                ))}
            </div>
          </section>
        )}
      </div>

      {/* Modal pour voir et télécharger les 3 fichiers statiques index.html, style.css, app.js */}
      <CodeModal isOpen={showCodeModal} onClose={() => setShowCodeModal(false)} />
    </div>
  );
}
