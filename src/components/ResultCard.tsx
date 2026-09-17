import { InspectionImageItem } from '../types';
import { getNiveauBadgeStyle } from '../utils/fileHelpers';
import { AlertCircle, CheckCircle2, Loader2, RotateCw } from 'lucide-react';

interface ResultCardProps {
  item: InspectionImageItem;
  key?: string;
  onRetry?: (id: string) => void;
  disabled?: boolean;
}

export function ResultCard({ item, onRetry, disabled }: ResultCardProps) {
  const badgeStyle = item.result ? getNiveauBadgeStyle(item.result.niveau) : null;

  return (
    <div
      id={`result-${item.id}`}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs transition-all flex flex-col md:flex-row"
    >
      {/* Colonne Photo */}
      <div className="w-full md:w-64 md:min-w-[16rem] bg-slate-100 flex flex-col items-center justify-center p-3 border-b md:border-b-0 md:border-r border-slate-200">
        <div className="relative w-full aspect-4/3 rounded-lg overflow-hidden bg-slate-200 border border-slate-300">
          <img
            src={item.previewUrl}
            alt={item.fileName}
            className="w-full h-full object-cover"
          />
          {item.status === 'completed' && (
            <div className="absolute top-2 right-2 bg-emerald-600 text-white p-1 rounded-full shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
        </div>
        <div className="mt-2 w-full text-center">
          <p className="text-xs font-medium text-slate-700 truncate" title={item.fileName}>
            {item.fileName}
          </p>
        </div>
      </div>

      {/* Colonne Diagnostic */}
      <div className="flex-1 p-5 flex flex-col justify-center">
        {/* État : EN COURS D'ANALYSE */}
        {item.status === 'analyzing' && (
          <div className="flex flex-col items-start gap-3 py-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              Analyse en cours par Gemini 3.6 Flash...
            </div>
            <p className="text-sm text-slate-500">
              Évaluation technique unitaire de la photo selon la grille de hiérarchisation...
            </p>
          </div>
        )}

        {/* État : ERREUR */}
        {item.status === 'error' && (
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                <AlertCircle className="w-3.5 h-3.5" />
                Erreur d'analyse
              </span>
              {onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  disabled={disabled}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Réessayer cette photo
                </button>
              )}
            </div>
            <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <p className="font-semibold text-xs text-red-800 uppercase tracking-wide mb-1">
                Détail pour cette photo :
              </p>
              <p>{item.errorMessage || "Une erreur inattendue s'est produite lors de l'appel API."}</p>
            </div>
          </div>
        )}

        {/* État : TERMINÉ AVEC SUCCÈS */}
        {item.status === 'completed' && item.result && badgeStyle && (
          <div className="flex flex-col gap-4">
            {/* Badge de niveau coloré */}
            <div>
              <span
                className={`inline-block px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-xs ${badgeStyle.bgClass} ${badgeStyle.textClass}`}
              >
                {badgeStyle.label}
              </span>
            </div>

            {/* Description du problème */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Constat technique & Risques
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Visuel • Cause • Évolution
                </span>
              </div>
              <p className="text-sm text-slate-900 font-medium leading-relaxed bg-slate-50/90 p-3.5 rounded-lg border border-slate-200/80 whitespace-pre-line">
                {item.result.description_probleme}
              </p>
            </div>

            {/* Remédiation proposée */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Remédiation préconisée & Normes
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Travaux • DTU / Règles de l'art
                </span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed bg-slate-50/90 p-3.5 rounded-lg border border-slate-200/80 whitespace-pre-line">
                {item.result.remediation_proposee}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
