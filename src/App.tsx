import { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Images,
  ImagePlus,
  Trash2,
  Loader2,
  ScanLine,
  ScanSearch,
  X,
  LogOut,
} from 'lucide-react';
import { InspectionImageItem, DiagnosticResult } from './types';
import { fileToBase64, formatFileSize, prepareImageForAnalysis } from './utils/fileHelpers';
import { ResultCard } from './components/ResultCard';
import { LegendBar } from './components/LegendBar';

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
  const visibleResults = items.filter((item) => item.status !== 'pending');

  return (
    <div className="app-shell min-h-[100dvh] p-3 text-[#19313b] sm:p-4 xl:h-[100dvh] xl:overflow-hidden">
      <div className="mx-auto flex max-w-[1640px] flex-col gap-3.5 xl:h-full">
        <header className="relative shrink-0 overflow-hidden rounded-[22px] bg-[#17313d] px-5 py-4 text-white shadow-[0_12px_32px_-22px_rgba(14,43,54,0.75)] sm:px-6">
          <div className="pointer-events-none absolute -right-10 -top-24 h-52 w-52 rounded-full border border-white/10 sm:right-28" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-2 -top-16 h-52 w-52 rounded-full border border-white/10 sm:right-36" aria-hidden="true" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-white/15 bg-white/10 text-[#8fe3d2]">
                <ScanLine className="size-6" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8fe3d2]">Espace de diagnostic · PPPT</p>
                <h1 className="mt-0.5 text-lg font-semibold tracking-tight sm:text-[22px]">Diagnostic Technique Bâtiment</h1>
                <p className="mt-0.5 hidden text-xs text-white/60 sm:block">Analyse photo unitaire · Grille de hiérarchisation des interventions</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3 sm:justify-end sm:border-0 sm:pt-0">
              <div className="min-w-0 text-right">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Compte connecté</p>
                <p className="max-w-48 truncate text-xs font-medium text-white/90" title={email}>{email}</p>
              </div>
              <button type="button" onClick={() => void onSignOut()} disabled={isAnalyzing} className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40" title="Déconnexion" aria-label="Déconnexion">
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3.5 xl:grid-cols-[minmax(22rem,0.82fr)_minmax(0,1.35fr)]">
          <aside className="flex min-h-0 flex-col gap-3.5 xl:overflow-y-auto xl:pr-1">
            <section className="rounded-[20px] border border-[#dce6e8] bg-white p-5 shadow-[0_2px_14px_rgba(19,54,65,0.04)] sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f4f1] text-[#087f74]"><Images className="size-5" strokeWidth={1.8} /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087f74]">01 · Préparer l'analyse</p>
                  <h2 className="mt-0.5 text-lg font-semibold tracking-tight">Photos de visite</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#627781]">Ajoutez les vues à examiner. Chaque photo recevra son propre diagnostic.</p>
                </div>
              </div>

              {uploadError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{uploadError}</p>}
              <div
                onDragOver={(e) => { e.preventDefault(); if (!isAnalyzing) setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (!isAnalyzing && e.dataTransfer.files) handleAddFiles(e.dataTransfer.files); }}
                onClick={() => { if (!isAnalyzing) fileInputRef.current?.click(); }}
                onKeyDown={(event) => { if (!isAnalyzing && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); fileInputRef.current?.click(); } }}
                role="button"
                tabIndex={isAnalyzing ? -1 : 0}
                aria-disabled={isAnalyzing}
                className={`group flex cursor-pointer flex-col items-center rounded-2xl border border-dashed px-5 py-7 text-center transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f74] sm:py-8 ${isDragging ? 'border-[#087f74] bg-[#e8f7f3] ring-4 ring-[#d9f0e9]' : 'border-[#a9c9c5] bg-[#f5faf9] hover:border-[#087f74] hover:bg-[#edf7f5]'} ${isAnalyzing ? 'cursor-not-allowed opacity-55' : ''}`}
              >
                <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { if (e.target.files) handleAddFiles(e.target.files); e.target.value = ''; }} disabled={isAnalyzing} />
                <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-white text-[#087f74] shadow-[0_4px_14px_rgba(17,83,75,0.1)] transition-transform group-hover:-translate-y-0.5"><ImagePlus className="size-6" strokeWidth={1.7} /></span>
                <span className="text-sm font-semibold text-[#19313b]">Choisir des photos</span>
                <span className="mt-1 text-xs text-[#637b82]">ou glisser-déposer des images ici</span>
                <span className="mt-3 rounded-full border border-[#d8e8e4] bg-white px-3 py-1 text-[10px] font-medium text-[#637b82]">JPG, PNG, WEBP · 20 Mo max. par photo</span>
              </div>

              {items.length > 0 && (
                <div className="mt-5 border-t border-[#e5ecee] pt-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#19313b]"><Images className="size-4 text-[#087f74]" /> Sélection · {items.length} photo{items.length > 1 ? 's' : ''}</span>
                    {!isAnalyzing && <button type="button" onClick={handleClearAll} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[#a44b4b] hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-[#a44b4b]"><Trash2 className="size-3.5" /> Tout effacer</button>}
                  </div>
                  {isAnalyzing && currentIndex !== null && <p className="mb-3 text-xs font-medium text-[#087f74]" role="status">Traitement de la photo {currentIndex + 1} sur {items.length}</p>}
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
                    {items.map((item, idx) => (
                      <div key={item.id} className={`group relative aspect-square overflow-hidden rounded-xl border bg-[#eef3f4] ${currentIndex === idx ? 'border-[#087f74] ring-2 ring-[#9cd8cf]' : 'border-[#dce6e8]'}`}>
                        <img src={item.previewUrl} alt={item.fileName} className="size-full object-cover" />
                        {item.status === 'analyzing' && <div className="absolute inset-0 flex items-center justify-center bg-[#17313d]/65 text-white"><Loader2 className="size-6 animate-spin" /></div>}
                        {item.status === 'completed' && <span className="absolute left-1.5 top-1.5 rounded-full bg-[#087f74] p-1 text-white" title="Terminé"><CheckCircle2 className="size-3.5" /></span>}
                        {item.status === 'error' && <span className="absolute left-1.5 top-1.5 rounded-full bg-rose-600 p-1 text-white" title="Échec"><CircleAlert className="size-3.5" /></span>}
                        {!isAnalyzing && <button type="button" onClick={() => handleRemoveItem(item.id)} className="absolute right-1.5 top-1.5 rounded-full bg-[#17313d]/85 p-1 text-white transition-colors hover:bg-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label={`Retirer ${item.fileName}`} title="Retirer cette photo"><X className="size-3.5" /></button>}
                        <div className="absolute inset-x-0 bottom-0 truncate bg-[#17313d]/85 px-2 py-1.5 text-[10px] text-white" title={`${item.fileName} (${formatFileSize(item.fileSize)})`}>{item.fileName}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 border-t border-[#e5ecee] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-relaxed text-[#637b82]">{items.length === 0 ? 'Sélectionnez au moins une photo pour commencer.' : `${items.length} photo${items.length > 1 ? 's' : ''} prête${items.length > 1 ? 's' : ''} à analyser.`}</p>
                <button type="button" onClick={handleStartAnalysis} disabled={items.length === 0 || isAnalyzing} className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#087f74] px-4 text-sm font-semibold text-white shadow-[0_5px_15px_rgba(8,127,116,0.16)] transition-all hover:bg-[#076e65] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f74] disabled:cursor-not-allowed disabled:bg-[#dce6e8] disabled:text-[#82979c] disabled:shadow-none sm:w-auto">
                  {isAnalyzing ? <><Loader2 className="size-4 animate-spin" /> Analyse {currentIndex !== null ? currentIndex + 1 : 0}/{items.length}</> : <><ScanSearch className="size-4" /> Lancer l'analyse <ArrowRight className="size-4" /></>}
                </button>
              </div>
            </section>
            <LegendBar />
          </aside>

          <section className="flex min-h-[27rem] flex-col overflow-hidden rounded-[20px] border border-[#dce6e8] bg-white shadow-[0_2px_14px_rgba(19,54,65,0.04)] xl:min-h-0" aria-labelledby="results-heading">
            <div className="flex shrink-0 flex-col gap-3 border-b border-[#e5ecee] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf2f4] text-[#315b69]"><ClipboardCheck className="size-5" strokeWidth={1.8} /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#087f74]">02 · Examiner les résultats</p>
                  <h2 id="results-heading" className="mt-0.5 text-lg font-semibold tracking-tight">Diagnostics</h2>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                {isAnalyzing && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f4f1] px-2.5 py-1 text-[#087f74]"><Loader2 className="size-3 animate-spin" /> En cours</span>}
                {completedCount > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f4f1] px-2.5 py-1 text-[#087f74]"><CheckCircle2 className="size-3" /> {completedCount} terminé{completedCount > 1 ? 's' : ''}</span>}
                {errorCount > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-rose-700"><CircleAlert className="size-3" /> {errorCount} échec{errorCount > 1 ? 's' : ''}</span>}
                {!isStarted && <span className="rounded-full border border-[#dce6e8] px-2.5 py-1 text-[#71868e]">En attente</span>}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-[#fbfdfd] p-4 sm:p-5">
              {isStarted ? (
                <div className="space-y-3.5">{visibleResults.map((item) => <ResultCard key={item.id} item={item} onRetry={handleRetrySingle} disabled={isAnalyzing} />)}</div>
              ) : (
                <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce6e8] bg-white px-6 py-10 text-center">
                  <div className="relative mb-5 flex size-16 items-center justify-center rounded-2xl bg-[#edf7f5] text-[#087f74]"><ScanSearch className="size-8" strokeWidth={1.5} /><span className="absolute -right-1 -top-1 size-3 rounded-full border-[3px] border-white bg-[#74cbbb]" /></div>
                  <h3 className="text-base font-semibold tracking-tight text-[#19313b]">Prêt pour votre premier diagnostic</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#71868e]">Ajoutez les photos de votre visite, puis lancez l'analyse. Les résultats apparaîtront ici au fur et à mesure.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
