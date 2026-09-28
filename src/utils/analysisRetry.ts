import type { LocalisationPhoto } from '../types';

export class AnalysisRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AnalysisRequestError';
    this.status = status;
  }
}

function httpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  const status = error.status;
  return typeof status === 'number' ? status : undefined;
}

/** Authentication, quota and provider unavailability must suspend the lot.
 * A retry is manual because the server already tries a second model for 503/504. */
export function shouldPauseBatch(error: unknown): boolean {
  return [401, 403, 429, 503].includes(httpStatus(error) ?? -1);
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
