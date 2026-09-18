import { getNiveauBadgeStyle } from '../utils/fileHelpers';
import { DiagnosticNiveau } from '../types';
import { AlertTriangle, Clock3, Info, Leaf, ShieldAlert, Wrench, type LucideIcon } from 'lucide-react';

const NIVEAUX: { niveau: DiagnosticNiveau; description: string; detail: string; icon: LucideIcon; tone: string }[] = [
  {
    niveau: 'Curatif Niveau 1',
    description: 'Impact fort (< 2 ans)',
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
    detail: 'Rénovation / embellissement sans conséquence structurelle',
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
    niveau: 'Signalement',
    description: 'Hors PPPT (Informatif)',
    detail: 'Observation / vigilance (parties privatives / informatif)',
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
];

export function LegendBar() {
  return (
    <section className="rounded-[20px] border border-[#dce6e8] bg-white p-5 shadow-[0_2px_14px_rgba(19,54,65,0.04)]" aria-labelledby="legend-heading">
      <div className="mb-4">
        <h2 id="legend-heading" className="text-sm font-semibold text-[#19313b]">Repères de priorité PPPT</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[#71868e]">
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
              className="min-w-0 rounded-xl border border-[#e3ebed] bg-[#fbfdfd] p-2.5 transition-colors hover:bg-[#f2f8f7]"
              title={`${item.description} : ${item.detail}`}
            >
              <div className="mb-2 flex items-center justify-between gap-1">
                <span className={`flex size-7 items-center justify-center rounded-lg ${item.tone}`}><Icon className="size-4" strokeWidth={1.8} /></span>
                <span className={`size-2 rounded-full ${style.bgClass}`} aria-hidden="true" />
              </div>
              <p className="text-[11px] font-semibold leading-tight text-[#19313b]">{style.label}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-[#71868e]">{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
