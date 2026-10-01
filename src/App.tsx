import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  FileDown,
  ImagePlus,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import {
  DIAGNOSTIC_NIVEAUX,
  LOCALISATIONS_PHOTO,
  LOCALISATION_LABELS,
  type DiagnosticNiveau,
  type DiagnosticResult,
  type InspectionImageItem,
  type LocalisationPhoto,
} from './types';
import { getNiveauBadgeStyle, prepareImageForAnalysis } from './utils/fileHelpers';
import {
  AnalysisRequestError,
  batchPauseMessage,
  canRestoreCompletedResult,
  isResultOutdated,
  selectRemainingIndices,
  shouldPauseBatch,
} from './utils/analysisRetry';
import { AnalysisCancelledError, AnalysisController } from './utils/analysisControl';
import {
  cacheDiagnostic,
  clearDiagnosticCache,
  getCachedDiagnostic,
  makeDiagnosticCacheKey,
} from './utils/diagnosticCache';
import { countPriorityResults, filterDisplayedResults } from './utils/resultFilter';
import { LegendBar } from './components/LegendBar';
import { ResultCard } from './components/ResultCard';

interface AppProps {
  uid: string;
  email: string;
  getIdToken: () => Promise<string>;
  onSignOut: () => Promise<void>;
}

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_ORIGINAL_BYTES = 20_000_000;
const MAX_REQUEST_BYTES = 4_000_000;

interface PreparedPhoto {
  imageBase64: string;
  mimeType: string;
  localisation: LocalisationPhoto;
}

async function requestAnalysis(
  photo: PreparedPhoto,
  getIdToken: () => Promise<string>,
  signal: AbortSignal,
  recoveryAttempt: boolean,
): Promise<DiagnosticResult> {
  if (signal.aborted) throw new AnalysisCancelledError();
  const body = JSON.stringify({ ...photo, recoveryAttempt });
  if (new Blob([body]).size > MAX_REQUEST_BYTES) {
    throw new Error('Cette photo reste trop volumineuse après compression (limite de 4 Mo).');
  }

  const token = await getIdToken();
  if (signal.aborted) throw new AnalysisCancelledError();
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(), 70_000);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body,
      signal: controller.signal,
    });

    const data = await response.json().catch((error) => {
      if (controller.signal.aborted) throw error;
      return {};
    });
    if (signal.aborted) throw new AnalysisCancelledError();
    if (!response.ok) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      throw new AnalysisRequestError(
        data.error || ('Erreur lors de l’analyse (' + response.status + ').'),
        response.status,
        {
          code: data.code,
          canRetry: data.canRetry === true,
          retryAfterSeconds: data.retryAfterSeconds ?? (retryAfter > 0 ? retryAfter : undefined),
        },
      );
    }
    if (!data.statut_analyse || !data.priorite || !data.famille || !data.localisation
      || !data.etat_observations || !data.intervention || !data.confiance
      || !Number.isInteger(data.cout_estime_min_ttc_eur)
      || !Number.isInteger(data.cout_estime_max_ttc_eur)) {
      throw new Error('Réponse invalide : champs requis manquants.');
    }
    return data as DiagnosticResult;
  } catch (error) {
    if (signal.aborted) throw new AnalysisCancelledError();
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AnalysisRequestError('Analyse trop longue. Patientez avant de réessayer cette photo.', 504, {
        code: 'client_timeout',
        canRetry: false,
        retryAfterSeconds: 60,
      });
    }
    if (error instanceof TypeError) {
      throw new AnalysisRequestError('Connexion interrompue. Vérifiez votre connexion avant de reprendre.', 504, {
        code: 'network_error',
        canRetry: false,
        retryAfterSeconds: 60,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
  }
}

export default function App({ uid, email, getIdToken, onSignOut }: AppProps) {
  const [items, setItems] = useState<InspectionImageItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [batchMessage, setBatchMessage] = useState('');
  const [activePriorityFilter, setActivePriorityFilter] = useState<DiagnosticNiveau | null>(null);
  const [waiting, setWaiting] = useState<{ seconds: number; reason: 'pacing' | 'recovery' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisLockRef = useRef(false);
  const operationRef = useRef<AbortController | null>(null);
  const analysisControllerRef = useRef<AnalysisController | null>(null);
  if (!analysisControllerRef.current) analysisControllerRef.current = new AnalysisController(uid);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => () => {
    operationRef.current?.abort();
    itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  const handleAddFiles = (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList).filter(
      (file) => ACCEPTED_TYPES.has(file.type) && file.size <= MAX_ORIGINAL_BYTES,
    );
    setUploadError(
      filesArray.length === fileList.length
        ? ''
        : 'Certains fichiers ont été ignorés : seuls JPG, PNG et WEBP de 20 Mo maximum sont acceptés.',
    );
    if (filesArray.length === 0) return;

    const newItems: InspectionImageItem[] = filesArray.map((file) => ({
      id: 'img_' + Math.random().toString(36).substring(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      fileName: file.name,
      fileSize: file.size,
      localisation: 'non renseignée',
      status: 'pending',
    }));

    setItems((previous) => [...previous, ...newItems]);
  };

  const handleLocationChange = (id: string, localisation: LocalisationPhoto) => {
    if (analysisLockRef.current) return;
    setItems((previous) => previous.map((item) => {
      if (item.id !== id) return item;
      if (canRestoreCompletedResult(item, localisation)) {
        return { ...item, localisation, status: 'completed', errorMessage: undefined };
      }
      return { ...item, localisation };
    }));
  };

  const handleRemoveItem = (id: string) => {
    if (isAnalyzing) return;
    setItems((previous) => {
      const item = previous.find((candidate) => candidate.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return previous.filter((candidate) => candidate.id !== id);
    });
  };

  const handleClearAll = () => {
    if (isAnalyzing) return;
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
    setUploadError('');
    setBatchMessage('');
    setCurrentIndex(null);
    clearDiagnosticCache(uid);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const analyzeItem = async (item: InspectionImageItem, signal: AbortSignal) => {
    const localisation = item.localisation ?? 'non renseignée';
    const cacheKey = await makeDiagnosticCacheKey(item.file, localisation);
    if (signal.aborted) throw new AnalysisCancelledError();
    const retained = cacheKey ? getCachedDiagnostic(uid, cacheKey) : null;
    if (retained) return { result: retained, reused: true };

    const { base64Data, mimeType } = await prepareImageForAnalysis(item.file);
    if (signal.aborted) throw new AnalysisCancelledError();
    const photo = { imageBase64: base64Data, mimeType, localisation };
    let isLocalResult = false;

    return analysisControllerRef.current!.run(async (recoveryAttempt) => {
      const cached = cacheKey ? getCachedDiagnostic(uid, cacheKey) : null;
      isLocalResult = Boolean(cached);
      if (cached) return { result: cached, reused: true };
      const result = await requestAnalysis(photo, getIdToken, signal, recoveryAttempt);
      if (cacheKey) cacheDiagnostic(uid, cacheKey, result);
      return { result, reused: false };
    }, {
      signal,
      isLocalResult: () => isLocalResult,
      onWait: (seconds, reason) => setWaiting(seconds > 0 ? { seconds, reason } : null),
    });
  };

  const processItems = async (selectedItems: InspectionImageItem[]) => {
    if (selectedItems.length === 0 || analysisLockRef.current) return;
    const operation = new AbortController();
    operationRef.current = operation;
    analysisLockRef.current = true;
    setIsAnalyzing(true);
    setBatchMessage('');

    try {
      for (const item of selectedItems) {
        if (operation.signal.aborted) break;
        setCurrentIndex(itemsRef.current.findIndex((candidate) => candidate.id === item.id));
        setItems((previous) => previous.map((candidate) => (
          candidate.id === item.id
            ? { ...candidate, status: 'analyzing', errorMessage: undefined }
            : candidate
        )));

        try {
          const { result, reused } = await analyzeItem(item, operation.signal);
          setItems((previous) => previous.map((candidate) => (
            candidate.id === item.id
              ? {
                ...candidate,
                status: 'completed',
                result,
                reusedResult: reused,
                analyzedLocalisation: item.localisation ?? 'non renseignée',
                analyzedAt: reused ? undefined : new Date().toLocaleTimeString(),
              }
              : candidate
          )));
        } catch (error) {
          if (error instanceof AnalysisCancelledError || operation.signal.aborted) {
            setItems((previous) => previous.map((candidate) => (
              candidate.id === item.id
                ? { ...candidate, status: candidate.result ? 'completed' : 'pending', errorMessage: undefined }
                : candidate
            )));
            setBatchMessage('Analyse arrêtée. Les diagnostics obtenus sont conservés.');
            break;
          }

          setItems((previous) => previous.map((candidate) => (
            candidate.id === item.id
              ? {
                ...candidate,
                status: 'error',
                errorMessage: error instanceof Error ? error.message : 'Erreur lors du traitement de cette photo.',
              }
              : candidate
          )));
          if (shouldPauseBatch(error)) {
            setBatchMessage(batchPauseMessage(error));
            break;
          }
        }
      }
    } finally {
      operationRef.current = null;
      analysisLockRef.current = false;
      setIsAnalyzing(false);
      setCurrentIndex(null);
      setWaiting(null);
    }
  };

  const handleStartAnalysis = () => processItems(
    selectRemainingIndices(items).map((index) => items[index]),
  );

  const handleRetrySingle = (id: string) => {
    const item = items.find((candidate) => candidate.id === id);
    if (item) return processItems([item]);
  };

  const completedCount = items.filter(
    (item) => item.status === 'completed' && !isResultOutdated(item),
  ).length;
  const exportableCount = items.filter(
    (item) => item.status === 'completed' && item.result && !isResultOutdated(item),
  ).length;
  const errorCount = items.filter((item) => item.status === 'error').length;
  const outdatedCount = items.filter(isResultOutdated).length;
  const remainingCount = selectRemainingIndices(items).length;
  const isStarted = items.some((item) => item.status !== 'pending');
  const priorityCounts = Object.fromEntries(
    DIAGNOSTIC_NIVEAUX.map((priority) => [priority, countPriorityResults(items, priority)]),
  ) as Record<DiagnosticNiveau, number>;
  const visibleResults = filterDisplayedResults(items, activePriorityFilter);
  const displayNumberById = new Map(items.map((item, index) => [item.id, index + 1]));
  const activePriorityLabel = activePriorityFilter
    ? getNiveauBadgeStyle(activePriorityFilter).label
    : null;
  const visibleDiagnosticCount = visibleResults.filter(
    (item) => item.status === 'completed' && item.result,
  ).length;

  const remainingText = remainingCount === 0
    ? 'Toutes les photos sont analysées.'
    : remainingCount + ' photo' + (remainingCount > 1 ? 's' : '') + ' à analyser, actualiser ou réessayer.';

  const handleExportPptx = async () => {
    if (isExporting || isAnalyzing || exportableCount === 0) return;
    setIsExporting(true);
    setExportError('');
    try {
      const { buildDiagnosticPptx } = await import('./utils/pptxExport');
      const file = await buildDiagnosticPptx(items);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Diagnostics_France_Verte_${new Date().toISOString().slice(0, 10)}.pptx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'L’export PPTX a échoué. Réessayez.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fv-app-shell">
      <div className="fv-workspace">
        <header className="fv-topbar">
          <div className="fv-brand">
            <img
              src="/france-verte-logo.png"
              alt="France Verte — Bureau d'études fluides et thermiques"
              className="fv-brand-logo"
            />
          </div>

          <div className="fv-topbar-title">
            <p className="fv-eyebrow">Espace de diagnostic — PPPT</p>
            <h1>Diagnostic Technique Bâtiment</h1>
            <p className="fv-topbar-subtitle">Analyse photo unitaire · Grille de hiérarchisation des interventions</p>
          </div>

          <div className="fv-account">
            <div className="fv-account-copy">
              <p className="fv-account-label">Compte connecté</p>
              <a className="fv-account-email" href={'mailto:' + email} title={email}>{email}</a>
            </div>
            <button type="button" onClick={() => void onSignOut()} disabled={isAnalyzing} className="fv-signout">
              Déconnexion
            </button>
          </div>
        </header>

        <main className="fv-layout">
          <aside className="fv-sidebar">
            <section className="fv-upload-section" aria-labelledby="import-heading">
              <div className="fv-step-heading">
                <span className="fv-step-number fv-step-number--green" aria-hidden="true">01</span>
                <div>
                  <p className="fv-step-label">Étape</p>
                  <h2 id="import-heading" className="fv-step-title">Importer les photos</h2>
                </div>
              </div>

              {uploadError && <p role="alert" className="fv-upload-error">{uploadError}</p>}
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!isAnalyzing) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  if (!isAnalyzing && event.dataTransfer.files) handleAddFiles(event.dataTransfer.files);
                }}
                onClick={() => {
                  if (!isAnalyzing) fileInputRef.current?.click();
                }}
                onKeyDown={(event) => {
                  if (!isAnalyzing && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={isAnalyzing ? -1 : 0}
                aria-disabled={isAnalyzing}
                className={'fv-dropzone' + (isDragging ? ' is-dragging' : '') + (isAnalyzing ? ' is-disabled' : '')}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files) handleAddFiles(event.target.files);
                    event.target.value = '';
                  }}
                  disabled={isAnalyzing}
                />
                <span className="fv-upload-plus"><ImagePlus className="size-6" strokeWidth={1.7} /></span>
                <span className="fv-dropzone-title">Choisir des photos ou glisser-déposer</span>
                <span className="fv-dropzone-caption">JPG · PNG · WEBP — 20 Mo max. par photo</span>
              </div>

              <p className="fv-retention-note">Les diagnostics sont conservés 24 h avant suppression automatique.</p>

              {items.length > 0 && (
                <section className="fv-selection" aria-labelledby="selection-heading">
                  <div className="fv-selection-head">
                    <p id="selection-heading" className="fv-section-kicker">
                      Sélection — <strong>{items.length} photo{items.length > 1 ? 's' : ''}</strong>
                    </p>
                    {!isAnalyzing && (
                      <button type="button" onClick={handleClearAll} className="fv-text-button">
                        <Trash2 className="sr-only" /> Tout effacer
                      </button>
                    )}
                  </div>

                  <p className="fv-selection-guidance">Précisez la localisation de chaque photo si vous la connaissez.</p>
                  {isAnalyzing && currentIndex !== null && (
                    <p className="fv-selection-progress" role="status">
                      Traitement de la photo {currentIndex + 1} sur {items.length}
                    </p>
                  )}
                  <div className="fv-selection-list">
                    {items.map((item) => (
                      <article key={item.id} className="fv-selection-row">
                        <img src={item.previewUrl} alt="" className="fv-selection-thumb" />
                        <div className="fv-selection-copy">
                          <span className="fv-selection-name" title={item.fileName}>{item.fileName}</span>
                          <label className="fv-location-field" htmlFor={'location-' + item.id}>
                            <span className="fv-location-label">Localisation —</span>
                            <select
                              id={'location-' + item.id}
                              aria-label={'Localisation de ' + item.fileName}
                              value={item.localisation ?? 'non renseignée'}
                              onChange={(event) => handleLocationChange(
                                item.id,
                                event.target.value as LocalisationPhoto,
                              )}
                              disabled={isAnalyzing}
                              className="fv-location-select"
                            >
                              {LOCALISATIONS_PHOTO.map((localisation) => (
                                <option key={localisation} value={localisation}>
                                  {LOCALISATION_LABELS[localisation]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {!isAnalyzing && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="fv-selection-remove"
                            aria-label={'Retirer ' + item.fileName}
                            title="Retirer cette photo"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </article>
                    ))}
                  </div>

                  {batchMessage && <p role="alert" className="fv-batch-message">{batchMessage}</p>}
                  {waiting && (
                    <p role="status" aria-live="polite" className="fv-system-note">
                      {waiting.reason === 'recovery' ? 'Pause temporaire. Reprise automatique' : 'Prochaine tentative'} dans {waiting.seconds} s…
                    </p>
                  )}
                  <div className="fv-selection-actions">
                    <p className="fv-selection-status">{remainingText}</p>
                    <button
                      type="button"
                      onClick={handleStartAnalysis}
                      disabled={remainingCount === 0 || isAnalyzing}
                      className="fv-primary-button"
                    >
                      {isAnalyzing ? (
                        <><Loader2 className="size-3.5 animate-spin" /> Analyse {currentIndex !== null ? currentIndex + 1 : 0}/{items.length}</>
                      ) : (
                        <>{isStarted ? 'Reprendre l’analyse' : 'Lancer l’analyse'} <ArrowRight className="fv-button-arrow size-3.5" /></>
                      )}
                    </button>
                  </div>
                  {isAnalyzing && (
                    <button type="button" onClick={() => operationRef.current?.abort()} className="fv-stop-button">
                      Arrêter l’analyse
                    </button>
                  )}
                </section>
              )}
            </section>

            <LegendBar
              activePriority={activePriorityFilter}
              onPriorityChange={setActivePriorityFilter}
              priorityCounts={priorityCounts}
              resultsListId="results-list"
            />
          </aside>

          <section className="fv-results" aria-labelledby="results-heading">
            <div className="fv-results-step">
              <div className="fv-step-heading">
                <span className="fv-step-number fv-step-number--blue" aria-hidden="true">02</span>
                <div>
                  <p className="fv-step-label">Étape</p>
                  <p className="fv-step-title">Examiner les résultats</p>
                </div>
              </div>
            </div>

            <div className="fv-diagnostics-head">
              <div>
                <h2 id="results-heading">Diagnostics</h2>
                <p>Pré-analyse indicative générée à partir des photos importées</p>
                {activePriorityFilter && (
                  <p className="sr-only" role="status" aria-live="polite">
                    {visibleDiagnosticCount} diagnostic{visibleDiagnosticCount > 1 ? 's' : ''} affiché{visibleDiagnosticCount > 1 ? 's' : ''} pour ce filtre.
                  </p>
                )}
              </div>
              <div className="fv-diagnostics-pills">
                {exportableCount > 0 && (
                  <button type="button" className="fv-export-button" onClick={handleExportPptx}
                    disabled={isAnalyzing || isExporting}
                    title={`Exporter ${exportableCount} diagnostic${exportableCount > 1 ? 's' : ''} terminé${exportableCount > 1 ? 's' : ''} et à jour`}>
                    {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
                    {isExporting ? 'Création du PPTX…' : 'Exporter tout en PPTX'}
                  </button>
                )}
                {activePriorityLabel && <span className="fv-filter-pill">Filtre — {activePriorityLabel}</span>}
                {isAnalyzing && (
                  <span className="fv-status-pill fv-status-pill--success">
                    <Loader2 className="mr-1 size-3 animate-spin" /> En cours
                  </span>
                )}
                {completedCount > 0 && (
                  <span className="fv-count-pill">{completedCount} terminé{completedCount > 1 ? 's' : ''}</span>
                )}
                {errorCount > 0 && (
                  <span className="fv-status-pill fv-status-pill--error">{errorCount} échec{errorCount > 1 ? 's' : ''}</span>
                )}
                {outdatedCount > 0 && <span className="fv-filter-pill">{outdatedCount} à actualiser</span>}
                {!isStarted && <span className="fv-status-pill fv-status-pill--waiting">En attente</span>}
              </div>
            </div>

            {exportError && <p className="fv-export-error" role="alert">{exportError}</p>}

            <div id="results-list" className="fv-results-list">
              {isStarted && visibleResults.length > 0 ? (
                <div>{visibleResults.map((item) => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    displayNumber={displayNumberById.get(item.id) ?? 1}
                    onRetry={handleRetrySingle}
                    disabled={isAnalyzing}
                  />
                ))}</div>
              ) : isStarted && activePriorityFilter ? (
                <div className="fv-empty-state">
                  <h3>Aucun diagnostic pour ce niveau</h3>
                  <p>Sélectionnez un autre niveau dans la grille ou réaffichez tous les diagnostics.</p>
                  <button type="button" onClick={() => setActivePriorityFilter(null)} className="fv-text-button">
                    Tout afficher
                  </button>
                </div>
              ) : (
                <div className="fv-empty-state">
                  <h3>Prêt pour votre premier diagnostic</h3>
                  <p>Ajoutez les photos de votre visite, puis lancez l’analyse. Les résultats apparaîtront ici au fur et à mesure.</p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
