import { AnalysisRequestError } from './analysisRetry';

const REQUEST_SPACING_MS = 15_000;
const MAX_AUTOMATIC_WAIT_MS = 120_000;

type WaitReason = 'pacing' | 'recovery';

export interface AnalysisRunOptions {
  signal?: AbortSignal;
  onWait?: (seconds: number, reason: WaitReason) => void;
  isLocalResult?: () => boolean;
}

export interface AnalysisControlDependencies {
  now: () => number;
  sleep: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  random: () => number;
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  withLock: <T>(name: string, task: () => Promise<T>, signal?: AbortSignal) => Promise<T>;
}

interface CooldownState {
  nextAllowedAt: number;
  dailyResetAt: number;
}

interface RecoveryPlan {
  delayMs: number;
  automatic: boolean;
  recoveryAttempt: boolean;
}

type AttemptOutcome<T> =
  | { success: true; value: T }
  | { success: false; error: unknown; recovery?: RecoveryPlan };

export class AnalysisCancelledError extends Error {
  constructor() {
    super("L'analyse a été arrêtée.");
    this.name = 'AnalysisCancelledError';
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AnalysisCancelledError();
}

function abortableSleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(new AnalysisCancelledError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function browserStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

async function browserLock<T>(name: string, task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  throwIfAborted(signal);
  if (typeof navigator === 'undefined' || !navigator.locks?.request) return task();

  let taskStarted = false;
  try {
    return await navigator.locks.request(name, { mode: 'exclusive', ...(signal ? { signal } : {}) }, () => {
      taskStarted = true;
      throwIfAborted(signal);
      return task();
    });
  } catch (error) {
    throwIfAborted(signal);
    if (!taskStarted && error instanceof DOMException
      && ['SecurityError', 'NotSupportedError'].includes(error.name)) {
      return task();
    }
    throw error;
  }
}

const pacificFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
});

function pacificParts(timestamp: number): Record<string, number> {
  const parts: Record<string, number> = {};
  for (const part of pacificFormatter.formatToParts(timestamp)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return parts;
}

/** Gemini daily request quotas reset at Pacific midnight, including DST transitions. */
export function nextPacificQuotaResetAt(now: number): number {
  const today = pacificParts(now);
  const nextMidnightWallClock = Date.UTC(today.year, today.month - 1, today.day + 1);
  let midnight = nextMidnightWallClock + 8 * 60 * 60 * 1000;
  for (let iteration = 0; iteration < 3; iteration++) {
    const local = pacificParts(midnight);
    const wallClock = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const offset = wallClock - Math.floor(midnight / 1000) * 1000;
    midnight = nextMidnightWallClock - offset;
  }
  return midnight + 60_000;
}

/** Serializes this account's requests in one browser; it does not coordinate devices. */
export class AnalysisController {
  private readonly dependencies: AnalysisControlDependencies;
  private readonly storageKey: string;
  private readonly lockName: string;
  private queue: Promise<void> = Promise.resolve();
  private state: CooldownState = { nextAllowedAt: 0, dailyResetAt: 0 };

  constructor(ownerUid: string, dependencies: Partial<AnalysisControlDependencies> = {}) {
    const account = encodeURIComponent(ownerUid);
    this.storageKey = `diagnostic-analysis-cooldown:${account}`;
    this.lockName = `diagnostic-analysis-request:${account}`;
    this.dependencies = {
      now: dependencies.now ?? Date.now,
      sleep: dependencies.sleep ?? abortableSleep,
      random: dependencies.random ?? Math.random,
      storage: dependencies.storage === undefined ? browserStorage() : dependencies.storage,
      withLock: dependencies.withLock ?? browserLock,
    };
  }

  run<T>(request: (recoveryAttempt: boolean) => Promise<T>, options: AnalysisRunOptions = {}): Promise<T> {
    const operation = this.queue.then(async () => {
      throwIfAborted(options.signal);
      return this.dependencies.withLock(this.lockName, () => this.perform(request, options), options.signal);
    });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation.catch((error) => {
      throwIfAborted(options.signal);
      throw error;
    });
  }

  private readState(): CooldownState {
    try {
      const raw = this.dependencies.storage?.getItem(this.storageKey);
      const stored: unknown = raw ? JSON.parse(raw) : undefined;
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
        for (const field of ['nextAllowedAt', 'dailyResetAt'] as const) {
          const value = (stored as Record<string, unknown>)[field];
          if (typeof value === 'number' && Number.isFinite(value) && value > 0
            && value <= Number.MAX_SAFE_INTEGER) {
            this.state[field] = Math.max(this.state[field], value);
          }
        }
      }
    } catch {
      // Pacing still works within this controller when browser storage is unavailable.
    }
    const now = this.dependencies.now();
    if (this.state.nextAllowedAt <= now) this.state.nextAllowedAt = 0;
    if (this.state.dailyResetAt <= now) this.state.dailyResetAt = 0;
    return this.state;
  }

  private saveState(): void {
    try {
      this.dependencies.storage?.setItem(this.storageKey, JSON.stringify(this.state));
    } catch {
      // A storage failure must not discard the in-memory cooldown or an obtained result.
    }
  }

  private deferRequests(milliseconds: number): void {
    const state = this.readState();
    state.nextAllowedAt = Math.max(state.nextAllowedAt, this.dependencies.now() + milliseconds);
    this.saveState();
  }

  private dailyQuotaError(resetAt: number): AnalysisRequestError {
    return new AnalysisRequestError(
      'Le quota journalier Gemini est épuisé. Reprise après sa réinitialisation à minuit, heure du Pacifique.',
      429,
      { code: 'quota_daily', canRetry: false, retryAfterSeconds: Math.ceil((resetAt - this.dependencies.now()) / 1000) }
    );
  }

  private async waitUntil(target: number, reason: WaitReason, options: AnalysisRunOptions): Promise<void> {
    let remaining = target - this.dependencies.now();
    while (remaining > 0) {
      throwIfAborted(options.signal);
      options.onWait?.(Math.ceil(remaining / 1000), reason);
      throwIfAborted(options.signal);
      await this.dependencies.sleep(Math.min(remaining, 1000), options.signal);
      remaining = target - this.dependencies.now();
    }
    throwIfAborted(options.signal);
    options.onWait?.(0, reason);
  }

  private async beforeRequest(reason: WaitReason, options: AnalysisRunOptions): Promise<void> {
    while (true) {
      throwIfAborted(options.signal);
      const state = this.readState();
      if (state.dailyResetAt > this.dependencies.now()) throw this.dailyQuotaError(state.dailyResetAt);
      if (state.nextAllowedAt <= this.dependencies.now()) return;
      await this.waitUntil(state.nextAllowedAt, reason, options);
    }
  }

  private recordFailure(error: unknown): RecoveryPlan | undefined {
    if (!(error instanceof AnalysisRequestError)) return undefined;

    if (error.status === 429 && error.code === 'quota_daily') {
      this.readState().dailyResetAt = nextPacificQuotaResetAt(this.dependencies.now());
      this.saveState();
      return undefined;
    }

    const providerDelay = (error.retryAfterSeconds ?? 0) * 1000;
    let delayMs: number;
    let recoveryAttempt = false;
    let confirmedRetry = false;

    if (error.code === 'client_timeout' || error.code === 'network_error' || error.status === 429) {
      delayMs = Math.max(60_000, providerDelay);
      confirmedRetry = error.status === 429 && error.code === 'rate_limit' && error.canRetry;
    } else if ([503, 504].includes(error.status)) {
      const random = this.dependencies.random();
      const jitter = Number.isFinite(random) ? Math.floor(Math.min(1, Math.max(0, random)) * 3000) : 0;
      delayMs = Math.max(30_000 + jitter, providerDelay);
      confirmedRetry = error.code === 'provider_unavailable' && error.canRetry;
      recoveryAttempt = true;
    } else {
      return undefined;
    }

    this.deferRequests(delayMs);
    return { delayMs, automatic: confirmedRetry && delayMs <= MAX_AUTOMATIC_WAIT_MS, recoveryAttempt };
  }

  private async attempt<T>(
    request: (recoveryAttempt: boolean) => Promise<T>,
    recoveryAttempt: boolean,
    options: AnalysisRunOptions
  ): Promise<AttemptOutcome<T>> {
    throwIfAborted(options.signal);
    let value: T;
    try {
      value = await request(recoveryAttempt);
    } catch (error) {
      this.deferRequests(REQUEST_SPACING_MS);
      const recovery = this.recordFailure(error);
      throwIfAborted(options.signal);
      return { success: false, error, recovery };
    }
    if (options.isLocalResult?.() !== true) this.deferRequests(REQUEST_SPACING_MS);
    throwIfAborted(options.signal);
    return { success: true, value };
  }

  private async perform<T>(request: (recoveryAttempt: boolean) => Promise<T>, options: AnalysisRunOptions): Promise<T> {
    await this.beforeRequest('pacing', options);
    const first = await this.attempt(request, false, options);
    if (first.success === true) return first.value;
    if (!first.recovery?.automatic) throw first.error;

    await this.beforeRequest('recovery', options);
    const second = await this.attempt(request, first.recovery.recoveryAttempt, options);
    if (second.success === true) return second.value;
    throw second.error;
  }
}
