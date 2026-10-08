import { AlertCircle, CheckCircle2, FileDown, FileText, Loader2, WalletCards } from 'lucide-react';
import type { RecapitulatifCuratifsPartie3 } from '../part3/curativeSummary';
import type { FinalReportReadiness, FinalReportWorkspace } from '../report/finalReportReadiness';

interface FinalReportExportPanelProps {
  readiness: FinalReportReadiness;
  curativeSummary: RecapitulatifCuratifsPartie3;
  isExporting: boolean;
  isAnotherExporting: boolean;
  error: string;
  onOpenWorkspace: (workspace: FinalReportWorkspace) => void;
  onRequestPart3Validation: () => void;
  onExport: () => void;
}

function formatAmount(value: number | null): string {
  return value === null
    ? 'À confirmer'
    : `${new Intl.NumberFormat('fr-FR').format(value)} €`;
}

function workspaceLabel(workspace: FinalReportWorkspace): string {
  switch (workspace) {
    case 'part1': return 'Partie 1';
    case 'diagnostics': return 'Partie 2';
    case 'part3': return 'Partie 3';
  }
}

function ReadinessItem({
  number,
  title,
  detail,
  isReady,
  actionLabel,
  onAction,
}: {
  number: string;
  title: string;
  detail: string;
  isReady: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <article className={`fv-final-readiness-item${isReady ? ' is-ready' : ' is-blocked'}`}>
      <div className="fv-final-readiness-number" aria-hidden="true">{number}</div>
      <div>
        <h4>{title}</h4>
        <p>{detail}</p>
        {!isReady && actionLabel && onAction && (
          <button type="button" className="fv-final-readiness-action" onClick={onAction}>{actionLabel}</button>
        )}
      </div>
      {isReady ? <CheckCircle2 aria-label="Prête" /> : <AlertCircle aria-label="À compléter" />}
    </article>
  );
}

/**
 * Presentation-only panel. The report data remains owned by App, while this
 * component displays a read-only preflight and triggers the final action.
 */
export function FinalReportExportPanel({
  readiness,
  curativeSummary,
  isExporting,
  isAnotherExporting,
  error,
  onOpenWorkspace,
  onRequestPart3Validation,
  onExport,
}: FinalReportExportPanelProps) {
  const part1Detail = readiness.part1.isReady
    ? `${readiness.part1.total} éléments obligatoires prêts.`
    : `${readiness.part1.completed} / ${readiness.part1.total} éléments obligatoires renseignés.`;
  const diagnosticsDetail = readiness.diagnostics.isReady
    ? `${readiness.diagnostics.exportable} diagnostic${readiness.diagnostics.exportable > 1 ? 's' : ''} terminé${readiness.diagnostics.exportable > 1 ? 's' : ''} et à jour seront inclus.`
    : readiness.blockers.find((blocker) => blocker.workspace === 'diagnostics')?.message
      ?? 'Les diagnostics doivent être vérifiés.';
  const part3Detail = readiness.part3.isReady
    ? `${readiness.part3.totalStatuses} statuts documentaires valides.`
    : `${readiness.part3.completedStatuses} / ${readiness.part3.totalStatuses} statuts renseignés ; corrigez les champs signalés.`;
  const confirmCount = curativeSummary.lignes.filter((line) => line.montantEstimeTtcEur === null).length;
  const blockers = readiness.blockers;

  return (
    <section className="fv-final-report-panel" aria-labelledby="final-report-heading">
      <header className="fv-final-report-heading">
        <div>
          <p className="fv-eyebrow">Étape finale</p>
          <h3 id="final-report-heading">Préparation du rapport PPPT complet</h3>
          <p>Le fichier réunira les Parties 1, 2 et 3 dans une seule présentation A4. Les données restent dans cette session et seront perdues après un rechargement de la page.</p>
        </div>
        <span className={readiness.isReady ? 'fv-final-status is-ready' : 'fv-final-status'}>
          {readiness.isReady ? 'Prêt à exporter' : `${blockers.length} blocage${blockers.length > 1 ? 's' : ''}`}
        </span>
      </header>

      <div className="fv-final-readiness-grid">
        <ReadinessItem
          number="01"
          title="Informations du rapport"
          detail={part1Detail}
          isReady={readiness.part1.isReady}
          actionLabel="Compléter la Partie 1"
          onAction={() => onOpenWorkspace('part1')}
        />
        <ReadinessItem
          number="02"
          title="Diagnostics photo"
          detail={diagnosticsDetail}
          isReady={readiness.diagnostics.isReady}
          actionLabel="Voir les diagnostics"
          onAction={() => onOpenWorkspace('diagnostics')}
        />
        <ReadinessItem
          number="03"
          title="Documentation et synthèse"
          detail={part3Detail}
          isReady={readiness.part3.isReady}
          actionLabel="Afficher les champs à compléter"
          onAction={() => {
            onRequestPart3Validation();
            onOpenWorkspace('part3');
          }}
        />
      </div>

      <section className="fv-curative-preview" aria-labelledby="curative-preview-heading">
        <div className="fv-curative-preview-heading">
          <WalletCards className="size-4" />
          <div>
            <h4 id="curative-preview-heading">Aperçu du tableau récapitulatif curatif</h4>
            <p>Lecture seule depuis les diagnostics éligibles de la Partie 2. Les montants sont des estimations IA indicatives à vérifier par un ingénieur.</p>
          </div>
        </div>
        <div className="fv-curative-preview-grid">
          {(['Curatif Niveau 1', 'Curatif Niveau 2', 'Curatif Niveau 3'] as const).map((level) => {
            const lines = curativeSummary.lignes.filter((line) => line.niveau === level);
            return (
              <div key={level} className="fv-curative-preview-item">
                <span>{level}</span>
                <strong>{lines.length} {lines.length > 1 ? 'travaux' : 'travail'}</strong>
                <small>{formatAmount(curativeSummary.totauxParNiveau[level])}</small>
              </div>
            );
          })}
          <div className="fv-curative-preview-total">
            <span>Total curatif</span>
            <strong>{formatAmount(curativeSummary.totalTtcEur)}</strong>
            <small>{confirmCount > 0 ? `${confirmCount} montant${confirmCount > 1 ? 's' : ''} à confirmer` : 'Montants exploitables'}</small>
          </div>
        </div>
      </section>

      {!readiness.isReady && (
        <div className="fv-final-blockers" role="status">
          <AlertCircle className="size-4" />
          <div>
            <strong>Le rapport complet ne peut pas encore être généré.</strong>
            <ul>
              {blockers.map((blocker) => <li key={blocker.code}>{workspaceLabel(blocker.workspace)} — {blocker.message}</li>)}
            </ul>
          </div>
        </div>
      )}

      {error && <p className="fv-final-export-error" role="alert"><AlertCircle className="size-4" /> {error}</p>}

      <footer className="fv-final-report-actions">
        <div className="fv-final-report-action-copy">
          <FileText className="size-4" />
          <span>{readiness.isReady
            ? 'Le rapport sera généré sans relancer l’analyse photo et sans modifier les diagnostics existants.'
            : 'Complétez les éléments bloquants ci-dessus. Les commentaires et les captures DPE restent facultatifs.'}
          </span>
        </div>
        <button
          type="button"
          className="fv-primary-button fv-final-export-button"
          onClick={onExport}
          disabled={!readiness.isReady || isExporting || isAnotherExporting}
          title={isAnotherExporting
            ? 'Attendez la fin de l’export autonome des diagnostics'
            : readiness.isReady ? 'Télécharger le rapport PPPT complet' : 'Complétez les éléments bloquants avant l’export'}
        >
          {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
          {isExporting ? 'Création du rapport complet…' : 'Exporter le rapport PPPT complet'}
        </button>
      </footer>
    </section>
  );
}
