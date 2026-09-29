import type { DiagnosticNiveau } from '../types';

interface PriorityItem {
  niveau: DiagnosticNiveau;
  label: string;
  description: string;
  marker: string;
  emphasis?: 'confirm';
}

const NIVEAUX: PriorityItem[] = [
  {
    niveau: 'Curatif Niveau 1',
    label: 'Curatif Niveau 1',
    description: 'Priorité immédiate à 2 ans',
    marker: 'I',
  },
  {
    niveau: 'Curatif Niveau 2',
    label: 'Curatif Niveau 2',
    description: 'Impact modéré 3 à 5 ans',
    marker: 'II',
  },
  {
    niveau: 'Curatif Niveau 3',
    label: 'Curatif Niveau 3',
    description: 'Impact faible 6 à 10 ans',
    marker: 'III',
  },
  {
    niveau: 'Entretien',
    label: 'Entretien',
    description: 'Hors PPPT (Courant)',
    marker: '·',
  },
  {
    niveau: 'Signalement hors PPPT à vérifier',
    label: 'Signalement à vérifier',
    description: 'Périmètre à vérifier',
    marker: '·',
  },
  {
    niveau: 'Travaux énergétiques',
    label: 'Travaux énergétiques',
    description: 'Performance & Thermique',
    marker: '·',
  },
  {
    niveau: 'À confirmer / expertise nécessaire',
    label: 'À confirmer',
    description: 'Photo ou gravité incertaine',
    marker: '◇',
    emphasis: 'confirm',
  },
];

interface LegendBarProps {
  activePriority: DiagnosticNiveau | null;
  onPriorityChange: (priority: DiagnosticNiveau | null) => void;
  priorityCounts: Readonly<Record<DiagnosticNiveau, number>>;
  resultsListId: string;
}

export function LegendBar({
  activePriority,
  onPriorityChange,
  priorityCounts,
  resultsListId,
}: LegendBarProps) {
  return (
    <section className="fv-legend" aria-labelledby="legend-heading">
      <div className="fv-legend-head">
        <div>
          <h2 id="legend-heading" className="fv-legend-title">Grille interne de priorité</h2>
          <p className="fv-legend-reference">
            Loi Climat &amp; Résilience (art. 14-2 loi 1965) · Décret n°2022-663
          </p>
        </div>
        <button
          type="button"
          onClick={() => onPriorityChange(null)}
          disabled={!activePriority}
          className="fv-legend-reset"
        >
          Tout afficher
        </button>
      </div>

      <div className="fv-priority-list">
        {NIVEAUX.map((item) => {
          const isActive = activePriority === item.niveau;
          const count = priorityCounts[item.niveau];
          const className = 'fv-priority-item'
            + (isActive ? ' is-active' : '')
            + (item.emphasis === 'confirm' ? ' fv-priority-item--confirm' : '');

          return (
            <button
              type="button"
              key={item.niveau}
              aria-pressed={isActive}
              aria-controls={resultsListId}
              onClick={() => onPriorityChange(isActive ? null : item.niveau)}
              className={className}
              title={item.description}
            >
              <span className="fv-priority-marker" aria-hidden="true">{item.marker}</span>
              <span className="fv-priority-copy">
                <span className="fv-priority-name">{item.label}</span>
                <span className="fv-priority-description">{item.description}</span>
              </span>
              <span className="fv-priority-count" aria-label={count + ' diagnostic' + (count > 1 ? 's' : '')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
