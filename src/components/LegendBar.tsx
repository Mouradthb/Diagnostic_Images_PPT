import { getNiveauBadgeStyle } from '../utils/fileHelpers';
import type { DiagnosticNiveau } from '../types';
import { AlertTriangle, CircleHelp, Clock3, Info, Leaf, ShieldAlert, Wrench, type LucideIcon } from 'lucide-react';

const NIVEAUX: { niveau: DiagnosticNiveau; description: string; detail: string; icon: LucideIcon; tone: string }[] = [
  {
    niveau: 'Curatif Niveau 1',
    description: 'Priorité immédiate à 2 ans',
    detail: 'Urgent : sécurité personnes, bâti ou continuité de service',
    icon: ShieldAlert,
    tone: 'bg-rose-50 text-rose-700',
  },
  {
    niveau: 'Curatif Niveau 2',
    description: 'Impact modéré (3 à 5 ans)',
    detail: 'Correctif : éviter dégradation progressive sans danger immédiat',
    icon: AlertTriangle,
    tone: 'bg-amber-50 text-amber-700',
  },
  {
    niveau: 'Curatif Niveau 3',
    description: 'Impact faible (6 à 10 ans)',
    detail: 'Dégradation mineure sans enjeu fonctionnel ni simple choix décoratif',
    icon: Clock3,
    tone: 'bg-emerald-50 text-emerald-700',
  },
  {
    niveau: 'Entretien',
    description: 'Hors PPPT (Courant)',
    detail: 'Maintenance préventive courante, aucun désordre grave',
    icon: Wrench,
    tone: 'bg-teal-50 text-teal-700',
  },
  {
    niveau: 'Signalement hors PPPT à vérifier',
    description: 'Périmètre à vérifier',
    detail: 'Observation sans enjeu collectif démontré depuis la photo',
    icon: Info,
    tone: 'bg-sky-50 text-sky-700',
  },
  {
    niveau: 'Travaux énergétiques',
    description: 'Performance & Thermique',
    detail: 'Isolation, menuiseries, ventilation, chauffage collectif',
    icon: Leaf,
    tone: 'bg-lime-50 text-lime-800',
  },
  {
    niveau: 'À confirmer / expertise nécessaire',
    description: 'Photo ou gravité incertaine',
    detail: 'Inspection complémentaire avant toute priorisation',
    icon: CircleHelp,
    tone: 'bg-slate-100 text-slate-700',
  },
];

interface LegendBarProps {
  activePriority: DiagnosticNiveau | null;
  onPriorityChange: (priority: DiagnosticNiveau | null) => void;
  priorityCounts: Readonly<Record<DiagnosticNiveau, number>>;
  resultsListId: string;
}

export function LegendBar({ activePriority, onPriorityChange, priorityCounts, resultsListId }: LegendBarProps) {
  return (
    <section className="neumo-panel rounded-[20px] border border-[#dce6e8] bg-white p-5 shadow-[0_2px_14px_rgba(19,54,65,0.04)]" aria-labelledby="legend-heading">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="legend-heading" className="text-sm font-semibold text-[#19313b]">Grille interne de priorité</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-[#71868e]">
            Loi Climat &amp; Résilience (art. 14-2 loi 1965) • Décret n°2022-663
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#71868e]">
            Cliquez sur un niveau pour filtrer les diagnostics.
          </p>
        </div>
        {activePriority && (
          <button
            type="button"
            onClick={() => onPriorityChange(null)}
            className="neumo-legend-reset rounded-full px-2.5 py-1 text-[10px] font-semibold text-[#3356c9] transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3356c9]"
          >
            Tout afficher
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {NIVEAUX.map((item) => {
          const style = getNiveauBadgeStyle(item.niveau);
          const Icon = item.icon;
          const isActive = activePriority === item.niveau;
          const count = priorityCounts[item.niveau];
          return (
            <button
              type="button"
              key={item.niveau}
              aria-pressed={isActive}
              aria-controls={resultsListId}
              onClick={() => onPriorityChange(isActive ? null : item.niveau)}
              className={`neumo-legend-item min-w-0 rounded-xl border border-[#e3ebed] bg-[#fbfdfd] p-2.5 text-left transition-colors hover:bg-[#f2f8f7] ${isActive ? 'is-active' : ''}`}
              title={`${item.description} : ${item.detail}`}
            >
              <div className="mb-2 flex items-center justify-between gap-1">
                <span className={`neumo-icon flex size-7 items-center justify-center rounded-lg ${item.tone}`}><Icon className="size-4" strokeWidth={1.8} /></span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-[#627781]" aria-label={`${count} diagnostic${count > 1 ? 's' : ''}`}>{count}</span>
                  <span className={`size-2 rounded-full ${style.bgClass}`} aria-hidden="true" />
                </span>
              </div>
              <p className="text-[11px] font-semibold leading-tight text-[#19313b]">{style.label}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-[#71868e]">{item.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
