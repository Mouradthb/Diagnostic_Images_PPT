import { getNiveauBadgeStyle } from '../utils/fileHelpers';
import { DiagnosticNiveau } from '../types';

const NIVEAUX: { niveau: DiagnosticNiveau; description: string; detail: string }[] = [
  {
    niveau: 'Curatif Niveau 1',
    description: 'Impact fort (< 2 ans)',
    detail: 'Urgent : sécurité personnes, bâti ou continuité de service',
  },
  {
    niveau: 'Curatif Niveau 2',
    description: 'Impact modéré (3 à 5 ans)',
    detail: 'Correctif : éviter dégradation progressive sans danger immédiat',
  },
  {
    niveau: 'Curatif Niveau 3',
    description: 'Impact faible (6 à 10 ans)',
    detail: 'Rénovation / embellissement sans conséquence structurelle',
  },
  {
    niveau: 'Entretien',
    description: 'Hors PPPT (Courant)',
    detail: 'Maintenance préventive courante, aucun désordre grave',
  },
  {
    niveau: 'Signalement',
    description: 'Hors PPPT (Informatif)',
    detail: 'Observation / vigilance (parties privatives / informatif)',
  },
  {
    niveau: 'Travaux énergétiques',
    description: 'Performance & Thermique',
    detail: 'Isolation, menuiseries, ventilation, chauffage collectif',
  },
];

export function LegendBar() {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1">
        <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Grille de hiérarchisation officielle PPPT
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Loi Climat & Résilience (art. 14-2 loi 1965) • Décret n°2022-663
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {NIVEAUX.map((item) => {
          const style = getNiveauBadgeStyle(item.niveau);
          return (
            <div
              key={item.niveau}
              className="flex flex-col p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/60 transition-colors"
              title={`${item.description} : ${item.detail}`}
            >
              <span
                className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full text-center ${style.bgClass} ${style.textClass} mb-1.5`}
              >
                {style.label}
              </span>
              <span className="text-[11px] font-semibold text-slate-700 leading-tight">
                {item.description}
              </span>
              <span className="text-[10px] text-slate-500 line-clamp-2 leading-tight mt-0.5">
                {item.detail}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
