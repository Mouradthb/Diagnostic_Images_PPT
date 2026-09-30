import type { ReactNode } from 'react';
import { LOCALISATION_LABELS, type InspectionImageItem } from '../types';
import { isResultOutdated } from '../utils/analysisRetry';
import { getNiveauBadgeStyle } from '../utils/fileHelpers';
import { CircleAlert, Loader2, RotateCw } from 'lucide-react';

interface ResultCardProps {
  item: InspectionImageItem;
  onRetry?: (id: string) => void;
  disabled?: boolean;
}

interface DetailRowProps {
  label: string;
  tone?: 'yellow' | 'green';
  children: ReactNode;
}

function DetailRow({ label, tone, children }: DetailRowProps) {
  const dotClass = 'fv-detail-dot' + (tone ? ' fv-detail-dot--' + tone : '');
  return (
    <div className="fv-detail-row">
      <div className="fv-detail-label">
        <span className={dotClass} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function ResultCard({ item, onRetry, disabled }: ResultCardProps) {
  const result = item.result;
  const badgeStyle = result ? getNiveauBadgeStyle(result.priorite) : null;
  const isUnusable = result?.statut_analyse === 'image non exploitable';
  const isOutdated = isResultOutdated(item);
  const isConfirmation = badgeStyle?.label === 'À confirmer';
  const statusLabel = result?.statut_analyse === 'constat photographique indicatif'
    ? 'Pré-analyse indicative'
    : result?.statut_analyse === 'image non exploitable'
      ? 'Image non exploitable'
      : 'Expertise nécessaire';
  const priorityClass = isConfirmation
    ? 'fv-result-badge fv-result-badge--priority'
    : badgeStyle
      ? `fv-result-badge ${badgeStyle.bgClass} ${badgeStyle.textClass} ${badgeStyle.borderClass}`
      : 'fv-result-badge fv-result-badge--neutral';

  return (
    <article id={'result-' + item.id} className="fv-result-card">
      <div className="fv-result-summary">
        <div className="fv-result-image">
          <img src={item.previewUrl} alt={item.fileName} />
        </div>

        <div className="fv-result-copy">
          {result && badgeStyle && (
            <div className="fv-result-badges">
              <span className={priorityClass}>{badgeStyle.label.toUpperCase()}</span>
              <span className="fv-result-badge fv-result-badge--neutral">Confiance : {result.confiance}</span>
              <span className="fv-result-badge fv-result-badge--neutral">Périmètre : {result.perimetre}</span>
            </div>
          )}
          <h3 className="fv-result-file" title={item.fileName}>{item.fileName}</h3>
          <div className="fv-result-meta">
            {result && (
              <>
                <span><strong>Domaines</strong> — {result.domaines.join(' · ') || 'Non précisé'}</span>
                <span><strong>Type</strong> — {statusLabel}</span>
              </>
            )}
            <span><strong>Localisation</strong> — {LOCALISATION_LABELS[item.localisation ?? 'non renseignée']}</span>
            {item.analyzedAt && <span><strong>Analysée à</strong> — {item.analyzedAt}</span>}
          </div>

          {!result && item.status === 'pending' && (
            <div className="fv-result-state">
              <span className="fv-status-pill fv-status-pill--waiting">En attente</span>
              Cette photo sera prête à examiner après le lancement de l’analyse.
            </div>
          )}

          {item.status === 'analyzing' && (
            <div className="fv-result-state" role="status">
              <span className="fv-status-pill fv-status-pill--success"><Loader2 className="mr-1 size-3 animate-spin" /> Analyse en cours</span>
              Évaluation technique de cette photo selon la grille PPPT…
            </div>
          )}

          {item.status === 'error' && (
            <div className="fv-result-state" role="alert">
              <span className="fv-status-pill fv-status-pill--error"><CircleAlert className="mr-1 size-3" /> Analyse interrompue</span>
              <span>{item.errorMessage || 'Une erreur inattendue s’est produite lors de l’appel API.'}</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  disabled={disabled}
                  className="fv-inline-action"
                >
                  Réessayer
                </button>
              )}
            </div>
          )}

          {isOutdated && (
            <div className="fv-result-state" role="status">
              <span>
                Localisation modifiée — résultat conservé pour « {LOCALISATION_LABELS[item.analyzedLocalisation ?? 'non renseignée']} ».
              </span>
              {onRetry && item.status === 'completed' && (
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  disabled={disabled}
                  className="fv-inline-action"
                >
                  <RotateCw className="mr-1 inline size-3" /> Actualiser l’analyse
                </button>
              )}
            </div>
          )}

          {item.reusedResult && !isOutdated && (
            <div className="fv-result-state">
              Diagnostic conservé réutilisé — aucun nouvel appel.
            </div>
          )}
        </div>
      </div>

      {result && badgeStyle && (
        <div className="fv-result-details">
          <DetailRow label="Constat visible">
            <p className="fv-detail-text">{result.constat}</p>
          </DetailRow>

          {!isUnusable && (
            <DetailRow label="Risque à surveiller" tone="yellow">
              <p className="fv-detail-text">{result.risque}</p>
            </DetailRow>
          )}

          <DetailRow label="Action recommandée" tone="green">
            <p className="fv-detail-text">{result.action}</p>
            {result.verification && (
              <p className="fv-detail-followup">
                <strong>Vérification sur site — </strong>{result.verification}
              </p>
            )}
          </DetailRow>

          <DetailRow label="Limite de la photo">
            <p className="fv-detail-text">{result.limites}</p>
          </DetailRow>
        </div>
      )}
    </article>
  );
}
