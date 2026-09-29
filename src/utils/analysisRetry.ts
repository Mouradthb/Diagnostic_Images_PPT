import type { LocalisationPhoto } from '../types';

export const ANALYSIS_ERROR_CODES = [
  'quota_daily', 'rate_limit', 'quota_unknown', 'provider_unavailable',
  'request_aborted', 'client_timeout', 'network_error',
] as const;

export type AnalysisErrorCode = (typeof ANALYSIS_ERROR_CODES)[number];

export interface AnalysisRequestErrorOptions {
  code?: string;
  retryAfterSeconds?: number;
  canRetry?: boolean;
}

export class AnalysisRequestError extends Error {
  readonly status: number;
  readonly code?: AnalysisErrorCode;
  readonly retryAfterSeconds?: number;
  readonly canRetry: boolean;

  constructor(message: string, status: number, options: AnalysisRequestErrorOptions = {}) {
    super(message);
    this.name = 'AnalysisRequestError';
    this.status = status;
    if (ANALYSIS_ERROR_CODES.includes(options.code as AnalysisErrorCode)) {
      this.code = options.code as AnalysisErrorCode;
    }
    if (typeof options.retryAfterSeconds === 'number'
      && Number.isFinite(options.retryAfterSeconds)
      && options.retryAfterSeconds > 0
      && options.retryAfterSeconds <= Number.MAX_SAFE_INTEGER / 1000) {
      this.retryAfterSeconds = options.retryAfterSeconds;
    }
    this.canRetry = options.canRetry === true;
  }
}

function httpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  const status = error.status;
  return typeof status === 'number' ? status : undefined;
}

/** Only the request controller may perform a bounded recovery before the lot pauses. */
export function shouldPauseBatch(error: unknown): boolean {
  return [401, 403, 429, 503, 504].includes(httpStatus(error) ?? -1)
    || (error instanceof AnalysisRequestError && ['client_timeout', 'network_error'].includes(error.code ?? ''));
}

export function batchPauseMessage(error: unknown): string {
  if (error instanceof AnalysisRequestError) {
    if (error.status === 429 && error.code === 'quota_daily') {
      return 'Analyse suspendue : le quota journalier Gemini de ce projet est épuisé. Reprise après sa réinitialisation à minuit, heure du Pacifique. Les résultats obtenus sont conservés.';
    }
    if (error.status === 429 && error.code === 'rate_limit') {
      return 'Analyse suspendue : la limite de débit Gemini est atteinte. Attendez avant de reprendre. Les résultats obtenus sont conservés.';
    }
    if (error.status === 429) {
      return 'Analyse suspendue : une limite Gemini est atteinte. Vérifiez le quota de ce projet dans Google AI Studio avant de reprendre. Les résultats obtenus sont conservés.';
    }
    if (error.code === 'client_timeout') {
      return 'Analyse suspendue : la requête a dépassé sa durée prévue. Attendez avant de réessayer cette photo. Les résultats obtenus sont conservés.';
    }
    if (error.code === 'network_error') {
      return 'Analyse suspendue : connexion interrompue, vérifiez votre connexion avant de reprendre. Les résultats obtenus sont conservés.';
    }
  }
  if ([503, 504].includes(httpStatus(error) ?? -1)) {
    return 'Analyse suspendue : Gemini reste temporairement indisponible. Réessayez plus tard. Les résultats obtenus sont conservés.';
  }
  return 'Analyse suspendue : vérifiez votre accès Gemini avant de reprendre. Les résultats obtenus sont conservés.';
}

interface PhotoAnalysisContext {
  result?: unknown;
  localisation?: LocalisationPhoto;
  analyzedLocalisation?: LocalisationPhoto;
}

export function isResultOutdated(item: PhotoAnalysisContext): boolean {
  return Boolean(item.result)
    && (item.localisation ?? 'non renseignée') !== (item.analyzedLocalisation ?? 'non renseignée');
}

/** A failed refresh can reuse the retained result when the user restores its original context. */
export function canRestoreCompletedResult(
  item: PhotoAnalysisContext & { status: string },
  localisation: LocalisationPhoto
): boolean {
  return item.status === 'error'
    && Boolean(item.result)
    && localisation === (item.analyzedLocalisation ?? 'non renseignée');
}

/** A resumed lot includes completed photos only when their context has changed. */
export function selectRemainingIndices(items: readonly (PhotoAnalysisContext & { status: string })[]): number[] {
  const remaining: number[] = [];
  items.forEach((item, index) => {
    if (item.status !== 'completed' || isResultOutdated(item)) remaining.push(index);
  });
  return remaining;
}
