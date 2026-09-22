export class AnalysisRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AnalysisRequestError';
    this.status = status;
  }
}

const RETRY_DELAYS_MS = [5_000] as const;
const MAX_JITTER_MS = 500;

function httpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  const status = error.status;
  return typeof status === 'number' ? status : undefined;
}

function defaultWait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry a transient Gemini 503 response once after the server-side model fallback. */
export async function withTransientRetry<T>(
  operation: () => Promise<T>,
  wait: (ms: number) => Promise<void> = defaultWait
): Promise<T> {
  for (let retry = 0; ; retry++) {
    try {
      return await operation();
    } catch (error) {
      if (httpStatus(error) !== 503 || retry >= RETRY_DELAYS_MS.length) throw error;
      await wait(RETRY_DELAYS_MS[retry] + Math.floor(Math.random() * MAX_JITTER_MS));
    }
  }
}

/** Authentication, quota and persistent unavailability errors must suspend the lot. */
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
