import type { ReactNode } from 'react';
import { LOCALISATION_LABELS, type InspectionImageItem } from '../types';
import { isResultOutdated } from '../utils/analysisRetry';
import { getNiveauBadgeStyle } from '../utils/fileHelpers';
import { CircleAlert, Loader2, RotateCw } from 'lucide-react';

interface ResultCardProps {
  item: InspectionImageItem;
  displayNumber: number;
  onRetry?: (id: string) => void;
  disabled?: boolean;
}

interface ResultTableRowProps {
  label: string;
  children: ReactNode;
}

function ResultTableRow({ label, children }: ResultTableRowProps) {
  return (
    <tr className="fv-result-table-row">
      <td colSpan={3}>
        <h4 className="fv-result-table-row-heading">{label}</h4>
        {children}
      </td>
    </tr>
  );
}

export function ResultCard({ item, displayNumber, onRetry, disabled }: ResultCardProps) {
  const result = item.result;
  const badgeStyle = result ? getNiveauBadgeStyle(result.priorite) : null;
  const isOutdated = isResultOutdated(item);
  const isConfirmation = badgeStyle?.label === 'À confirmer';
  const priorityClass = isConfirmation
    ? 'fv-result-table-priority fv-result-table-priority--confirm'
    : badgeStyle
      ? `fv-result-table-priority ${badgeStyle.bgClass} ${badgeStyle.textClass} ${badgeStyle.borderClass}`
      : 'fv-result-table-priority fv-result-table-priority--neutral';
  const isMaintenanceOrSignalement = result?.priorite === 'Entretien'
    || result?.priorite === 'Signalement hors PPPT à vérifier';
  const actionLabel = isMaintenanceOrSignalement ? 'Recommandations' : 'Travaux à effectuer';
  const hasCostEstimate = Boolean(result && result.cout_estime_min_ttc_eur > 0);
  const costEstimate = result && hasCostEstimate
    ? result.cout_estime_min_ttc_eur === result.cout_estime_max_ttc_eur
      ? `${new Intl.NumberFormat('fr-FR').format(result.cout_estime_min_ttc_eur)} € TTC`
      : `${new Intl.NumberFormat('fr-FR').format(result.cout_estime_min_ttc_eur)} à ${new Intl.NumberFormat('fr-FR').format(result.cout_estime_max_ttc_eur)} € TTC`
    : 'À déterminer après visite et définition des travaux.';

  return (
    <article id={'result-' + item.id} className="fv-result-card">
      {result && badgeStyle ? (
        <table className="fv-result-table">
          <caption className="sr-only">
            Fiche de diagnostic numéro {displayNumber} — {badgeStyle.label}
          </caption>
          <colgroup>
            <col className="fv-result-table-number-column" />
            <col />
            <col className="fv-result-table-priority-column" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="fv-result-table-number">
                <span>N°</span>
                <strong>{displayNumber}</strong>
              </th>
              <th scope="col" className="fv-result-table-family">
                <span className="fv-result-table-field">Famille</span>
                <span className="fv-result-table-family-name">{result.famille}</span>
              </th>
              <th scope="col" className={priorityClass}>{badgeStyle.label.toUpperCase()}</th>
            </tr>
          </thead>
          <tbody>
            <ResultTableRow label="Localisation">
              <p className="fv-result-table-text">{result.localisation}</p>
              {item.localisation && item.localisation !== 'non renseignée' && (
                <p className="fv-result-table-context">Contexte déclaré : {LOCALISATION_LABELS[item.localisation]}</p>
              )}
            </ResultTableRow>

            <ResultTableRow label="État / observations">
              <p className="fv-result-table-text">{result.etat_observations}</p>
            </ResultTableRow>

            <ResultTableRow label={actionLabel}>
              <p className="fv-result-table-text">{result.intervention}</p>
            </ResultTableRow>

            {!isMaintenanceOrSignalement && (
              <ResultTableRow label="Chiffrage estimatif">
                <p className="fv-result-table-text"><strong>Coût estimé — </strong>{costEstimate}</p>
                {hasCostEstimate && (
                  <p className="fv-result-table-estimate-note">
                    Estimation IA — (Estimation indicative susceptible d’être ajustée après consultation des entreprises)
                  </p>
                )}
              </ResultTableRow>
            )}

            {isMaintenanceOrSignalement && (
              <ResultTableRow label="Illustrations">
                <figure className="fv-result-table-figure">
                  <img src={item.previewUrl} alt={'Photo importée — ' + item.fileName} />
                </figure>
              </ResultTableRow>
            )}
          </tbody>
        </table>
      ) : (
        <div className="fv-result-summary fv-result-summary--state">
          <div className="fv-result-image">
            <img src={item.previewUrl} alt={item.fileName} />
          </div>

          <div className="fv-result-copy">
            <h3 className="fv-result-file" title={item.fileName}>{item.fileName}</h3>
            <div className="fv-result-meta">
              <span><strong>Localisation</strong> — {LOCALISATION_LABELS[item.localisation ?? 'non renseignée']}</span>
              {item.analyzedAt && <span><strong>Analysée à</strong> — {item.analyzedAt}</span>}
            </div>

            {item.status === 'pending' && (
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
          </div>
        </div>
      )}

      {result && badgeStyle && item.status === 'analyzing' && (
        <div className="fv-result-state" role="status">
          <span className="fv-status-pill fv-status-pill--success"><Loader2 className="mr-1 size-3 animate-spin" /> Analyse en cours</span>
          Actualisation de cette fiche…
        </div>
      )}

      {result && badgeStyle && item.status === 'error' && (
        <div className="fv-result-state" role="alert">
          <span className="fv-status-pill fv-status-pill--error"><CircleAlert className="mr-1 size-3" /> Analyse interrompue</span>
          <span>{item.errorMessage || 'Une erreur inattendue s’est produite lors de l’appel API.'}</span>
          {onRetry && (
            <button type="button" onClick={() => onRetry(item.id)} disabled={disabled} className="fv-inline-action">
              Réessayer
            </button>
          )}
        </div>
      )}

      {result && badgeStyle && isOutdated && (
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

      {result && badgeStyle && item.reusedResult && !isOutdated && (
        <div className="fv-result-state">
          Diagnostic conservé réutilisé — aucun nouvel appel.
        </div>
      )}
    </article>
  );
}
