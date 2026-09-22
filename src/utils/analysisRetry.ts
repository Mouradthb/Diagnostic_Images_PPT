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

/** A resumed lot must never re-analyse an already completed photo. */
export function selectRemainingIndices(items: readonly { status: string }[]): number[] {
  const remaining: number[] = [];
  items.forEach((item, index) => {
    if (item.status !== 'completed') remaining.push(index);
  });
  return remaining;
}
