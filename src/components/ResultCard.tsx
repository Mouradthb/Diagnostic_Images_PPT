import { InspectionImageItem } from '../types';
import { getNiveauBadgeStyle } from '../utils/fileHelpers';
import {
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  ClipboardList,
  Clock3,
  Eye,
  Info,
  Loader2,
  MapPin,
  RotateCw,
  ShieldAlert,
} from 'lucide-react';

interface ResultCardProps {
  item: InspectionImageItem;
  key?: string;
  onRetry?: (id: string) => void;
  disabled?: boolean;
}

export function ResultCard({ item, onRetry, disabled }: ResultCardProps) {
  const badgeStyle = item.result ? getNiveauBadgeStyle(item.result.priorite) : null;
  const isUnusable = item.result?.statut_analyse === 'image non exploitable';
  const statusLabel = item.result?.statut_analyse === 'constat photographique indicatif'
    ? 'Pré-analyse indicative'
    : item.result?.statut_analyse === 'image non exploitable'
      ? 'Image non exploitable'
      : 'Expertise nécessaire';

  return (
    <div
      id={`result-${item.id}`}
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#dce6e8] bg-white shadow-[0_3px_14px_rgba(19,54,65,0.04)] md:flex-row"
    >
      <div className="border-b border-[#e5ecee] bg-[#f1f6f6] p-3 md:w-48 md:shrink-0 md:border-b-0 md:border-r xl:w-52">
        <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-[#dfe9ea]">
          <img src={item.previewUrl} alt={item.fileName} className="size-full object-cover" />
          {item.status === 'completed' && item.result?.statut_analyse === 'constat photographique indicatif' && <span className="absolute right-2 top-2 rounded-full bg-[#087f74] p-1.5 text-white shadow-sm" title="Pré-analyse indicative terminée"><CheckCircle2 className="size-4" /></span>}
          {item.status === 'completed' && item.result?.statut_analyse !== 'constat photographique indicatif' && <span className="absolute right-2 top-2 rounded-full bg-slate-700 p-1.5 text-white shadow-sm" title="Vérification nécessaire"><CircleHelp className="size-4" /></span>}
        </div>
        <p className="mt-2.5 truncate text-xs font-medium text-[#3a5660]" title={item.fileName}>{item.fileName}</p>
        {item.analyzedAt && <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#71868e]"><Clock3 className="size-3" /> {item.analyzedAt}</p>}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center p-4 sm:p-5">
        {item.status === 'analyzing' && (
          <div className="space-y-3 py-2" role="status">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e7f4f1] px-3 py-1.5 text-xs font-semibold text-[#087f74]"><Loader2 className="size-3.5 animate-spin" /> Analyse en cours</span>
            <p className="text-sm leading-relaxed text-[#627781]">Évaluation technique de cette photo selon la grille PPPT…</p>
          </div>
        )}

        {item.status === 'error' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"><CircleAlert className="size-3.5" /> Analyse interrompue</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  disabled={disabled}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#dce6e8] bg-white px-3 text-xs font-semibold text-[#19313b] transition-colors hover:bg-[#f2f8f7] focus-visible:outline-2 focus-visible:outline-[#087f74] disabled:opacity-50"
                >
                  <RotateCw className="size-3.5" /> Réessayer
                </button>
              )}
            </div>
            <p className="break-words rounded-xl border border-rose-100 bg-rose-50/70 p-3 text-sm leading-relaxed text-rose-800">{item.errorMessage || "Une erreur inattendue s'est produite lors de l'appel API."}</p>
          </div>
        )}

        {item.status === 'completed' && item.result && badgeStyle && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ${badgeStyle.bgClass} ${badgeStyle.textClass}`}>{badgeStyle.label}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#edf1fc] px-2.5 py-1 text-[11px] font-medium text-[#3356c9]"><Info className="size-3.5" /> {statusLabel}</span>
              <span className="rounded-full border border-[#dce6e8] px-2.5 py-1 text-[11px] font-medium text-[#536b75]">Confiance : {item.result.confiance}</span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-[#e5ecee] pb-3 text-xs text-[#627781]">
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> {item.result.perimetre}</span>
              {item.result.domaines.length > 0 && <span>Domaines : {item.result.domaines.join(', ')}</span>}
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[#315b69]"><Eye className="size-4" strokeWidth={1.8} /><h3 className="text-[11px] font-bold uppercase tracking-[0.1em]">Constat visible</h3></div>
              <p className="whitespace-pre-line break-words rounded-xl border border-[#dce6e8] bg-[#f6f9fa] p-3 text-sm leading-relaxed text-[#263e48] sm:p-3.5">{item.result.constat}</p>
            </div>

            {!isUnusable && (
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-[#315b69]"><ShieldAlert className="size-4" strokeWidth={1.8} /><h3 className="text-[11px] font-bold uppercase tracking-[0.1em]">Risque à surveiller</h3></div>
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-[#263e48]">{item.result.risque}</p>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 p-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-800">Action recommandée</h3>
                <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-[#263e48]">{item.result.action}</p>
              </div>
              <div className="rounded-xl border border-[#dce6e8] bg-[#f6f9fa] p-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#315b69]">Vérification sur site</h3>
                <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-[#263e48]">{item.result.verification}</p>
              </div>
            </div>

            <div className="border-t border-[#e5ecee] pt-3">
              <div className="mb-1 flex items-center gap-2 text-[#536b75]"><ClipboardList className="size-4" strokeWidth={1.8} /><h3 className="text-[11px] font-bold uppercase tracking-[0.1em]">Limite de la photo</h3></div>
              <p className="break-words text-xs leading-relaxed text-[#627781]">{item.result.limites}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
