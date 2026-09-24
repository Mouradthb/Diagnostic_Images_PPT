import { getNiveauBadgeStyle } from '../utils/fileHelpers';
import { DiagnosticNiveau } from '../types';
import { AlertTriangle, CircleHelp, Clock3, Info, Leaf, ShieldAlert, Wrench, type LucideIcon } from 'lucide-react';

const NIVEAUX: { niveau: DiagnosticNiveau; description: string; detail: string; icon: LucideIcon; tone: string }[] = [
  {
    niveau: 'Curatif Niveau 1',
    description: 'Priorité immédiate à 2 ans',
    detail: 'Urgent : sécurité personnes, bâti ou continuité de service',
    icon: ShieldAlert,
    tone: 'bg-[#FEE2E2] text-[#991B1B]',
  },
  {
    niveau: 'Curatif Niveau 2',
    description: 'Impact modéré (3 à 5 ans)',
    detail: 'Correctif : éviter dégradation progressive sans danger immédiat',
    icon: AlertTriangle,
    tone: 'bg-[#FFEDD5] text-[#9A3412]',
  },
  {
    niveau: 'Curatif Niveau 3',
    description: 'Impact faible (6 à 10 ans)',
    detail: 'Dégradation mineure sans enjeu fonctionnel ni simple choix décoratif',
    icon: Clock3,
    tone: 'bg-[#D7F3E1] text-[#0B3D24]',
  },
  {
    niveau: 'Entretien',
    description: 'Hors PPPT (Courant)',
    detail: 'Maintenance préventive courante, aucun désordre grave',
    icon: Wrench,
    tone: 'bg-[#E0F2FE] text-[#0C4A6E]',
  },
  {
    niveau: 'Signalement hors PPPT à vérifier',
    description: 'Périmètre à vérifier',
    detail: 'Observation sans enjeu collectif démontré depuis la photo',
    icon: Info,
    tone: 'bg-[#E8EDFF] text-[#1D315B]',
  },
  {
    niveau: 'Travaux énergétiques',
    description: 'Performance & Thermique',
    detail: 'Isolation, menuiseries, ventilation, chauffage collectif',
    icon: Leaf,
    tone: 'bg-[#D7F3E1] text-[#0B3D24]',
  },
  {
    niveau: 'À confirmer / expertise nécessaire',
    description: 'Photo ou gravité incertaine',
    detail: 'Inspection complémentaire avant toute priorisation',
    icon: CircleHelp,
    tone: 'bg-[#E5E7EB] text-[#374151]',
  },
];

export function LegendBar() {
  return (
    <section className="neumo-panel rounded-3xl border border-[#dce6e8] bg-white p-5" aria-labelledby="legend-heading">
      <div className="mb-4">
        <h2 id="legend-heading" className="text-sm font-semibold text-[#1B1B1F]">Grille interne de priorité</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[#5D6270]">
          Loi Climat & Résilience (art. 14-2 loi 1965) • Décret n°2022-663
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {NIVEAUX.map((item) => {
          const style = getNiveauBadgeStyle(item.niveau);
          const Icon = item.icon;
          return (
            <div
              key={item.niveau}
              className="neumo-legend-item min-w-0 rounded-xl border border-[#e3ebed] bg-[#fbfdfd] p-2.5 transition-colors hover:bg-[#f2f8f7]"
              title={`${item.description} : ${item.detail}`}
            >
              <div className="mb-2 flex items-center justify-between gap-1">
                <span className={`neumo-icon flex size-7 items-center justify-center rounded-lg ${item.tone}`}><Icon className="size-4" strokeWidth={1.8} /></span>
                <span className={`size-2 rounded-full ${style.bgClass}`} aria-hidden="true" />
              </div>
              <p className="text-[11px] font-semibold leading-tight text-[#1B1B1F]">{style.label}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-[#5D6270]">{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
