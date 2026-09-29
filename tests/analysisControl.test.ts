import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AnalysisCancelledError,
  AnalysisController,
  nextPacificQuotaResetAt,
  type AnalysisControlDependencies,
} from '../src/utils/analysisControl.ts';
import { AnalysisRequestError } from '../src/utils/analysisRetry.ts';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

function fakeEnvironment(now = 0) {
  const clock = { now };
  const storage = memoryStorage();
  const dependencies: AnalysisControlDependencies = {
    now: () => clock.now,
    sleep: async (milliseconds, signal) => {
      if (signal?.aborted) throw new AnalysisCancelledError();
      clock.now += milliseconds;
    },
    random: () => 0,
    storage,
    withLock: async <T>(_name: string, task: () => Promise<T>) => task(),
  };
  return { clock, storage, dependencies };
}

test('a confirmed 503 waits once then sends exactly one fallback-only recovery', async () => {
  const { clock, dependencies } = fakeEnvironment();
  const controller = new AnalysisController('member', dependencies);
  const attempts: { recovery: boolean; at: number }[] = [];
  const waits: { seconds: number; reason: string }[] = [];
  const result = await controller.run(async (recovery) => {
    attempts.push({ recovery, at: clock.now });
    if (attempts.length === 1) {
      throw new AnalysisRequestError('Unavailable', 503, { code: 'provider_unavailable', canRetry: true });
    }
    return 'diagnostic';
  }, { onWait: (seconds, reason) => waits.push({ seconds, reason }) });
  assert.equal(result, 'diagnostic');
  assert.deepEqual(attempts, [{ recovery: false, at: 0 }, { recovery: true, at: 30_000 }]);
  assert.deepEqual(waits[0], { seconds: 30, reason: 'recovery' });
  assert.deepEqual(waits.at(-1), { seconds: 0, reason: 'recovery' });
});

test('a failed recovery stops at two requests and retains its manual cooldown', async () => {
  const { clock, storage, dependencies } = fakeEnvironment();
  const controller = new AnalysisController('member', dependencies);
  let calls = 0;
  const failure = new AnalysisRequestError('Still unavailable', 504, { code: 'provider_unavailable', canRetry: true });
  await assert.rejects(controller.run(async () => {
    calls++;
    throw failure;
  }), (error: unknown) => error === failure);
  assert.equal(calls, 2);
  assert.equal(clock.now, 30_000);
  assert.equal(JSON.parse([...storage.values.values()][0]).nextAllowedAt, 60_000);
});

test('daily exhaustion never retries and blocks new controllers until the Pacific reset', async () => {
  const { clock, storage, dependencies } = fakeEnvironment(Date.parse('2026-09-28T18:00:00Z'));
  const controller = new AnalysisController('member', dependencies);
  let calls = 0;
  const failure = new AnalysisRequestError('Daily quota', 429, { code: 'quota_daily', canRetry: true });
  await assert.rejects(controller.run(async () => {
    calls++;
    throw failure;
  }), (error: unknown) => error === failure);
  const stored = JSON.parse([...storage.values.values()][0]);
  assert.deepEqual(Object.keys(stored).sort(), ['dailyResetAt', 'nextAllowedAt']);
  assert.equal(stored.dailyResetAt, Date.parse('2026-09-29T07:01:00Z'));
  const reloaded = new AnalysisController('member', dependencies);
  await assert.rejects(reloaded.run(async () => {
    calls++;
    return 'unexpected';
  }), (error: unknown) => error instanceof AnalysisRequestError && error.code === 'quota_daily');
  assert.equal(calls, 1);
  clock.now = stored.dailyResetAt;
  assert.equal(await reloaded.run(async () => {
    calls++;
    return 'available';
  }), 'available');
  assert.equal(calls, 2);
});

test('an unknown 429 never retries automatically and a manual retry waits sixty seconds', async () => {
  const { clock, dependencies } = fakeEnvironment();
  const controller = new AnalysisController('member', dependencies);
  let calls = 0;
  const failure = new AnalysisRequestError('Quota not classified', 429, { code: 'quota_unknown', canRetry: true });
  await assert.rejects(controller.run(async () => {
    calls++;
    throw failure;
  }), (error: unknown) => error === failure);
  assert.equal(calls, 1);
  assert.equal(clock.now, 0);
  await controller.run(async (recovery) => {
    calls++;
    assert.equal(recovery, false);
    assert.equal(clock.now, 60_000);
  });
  assert.equal(calls, 2);
});

test('a confirmed rate limit honors the provider delay and retries the primary once', async () => {
  const { clock, dependencies } = fakeEnvironment();
  const controller = new AnalysisController('member', dependencies);
  const attempts: { recovery: boolean; at: number }[] = [];
  await controller.run(async (recovery) => {
    attempts.push({ recovery, at: clock.now });
    if (attempts.length === 1) {
      throw new AnalysisRequestError('Rate limit', 429, {
        code: 'rate_limit', retryAfterSeconds: 75, canRetry: true,
      });
    }
  });
  assert.deepEqual(attempts, [{ recovery: false, at: 0 }, { recovery: false, at: 75_000 }]);
});

test('long provider cooldowns remain manual without sleeping or issuing another request', async () => {
  const { clock, storage, dependencies } = fakeEnvironment();
  const controller = new AnalysisController('member', dependencies);
  let calls = 0;
  const failure = new AnalysisRequestError('Rate limit', 429, {
    code: 'rate_limit', retryAfterSeconds: 180, canRetry: true,
  });
  await assert.rejects(controller.run(async () => {
    calls++;
    throw failure;
  }), (error: unknown) => error === failure);
  assert.equal(calls, 1);
  assert.equal(clock.now, 0);
  assert.equal(JSON.parse([...storage.values.values()][0]).nextAllowedAt, 180_000);
});

test('a client network failure keeps a sixty-second manual cooldown without automatic recovery', async () => {
  const { clock, storage, dependencies } = fakeEnvironment();
  const controller = new AnalysisController('member', dependencies);
  let calls = 0;
  const failure = new AnalysisRequestError('Connection lost', 504, { code: 'network_error', canRetry: true });
  await assert.rejects(controller.run(async () => {
    calls++;
    throw failure;
  }), (error: unknown) => error === failure);
  assert.equal(calls, 1);
  assert.equal(clock.now, 0);
  assert.equal(JSON.parse([...storage.values.values()][0]).nextAllowedAt, 60_000);
});

test('unconfirmed, mismatched and non-provider failures do not trigger automatic requests', async () => {
  const failures = [
    new AnalysisRequestError('No confirmation', 503, { code: 'provider_unavailable' }),
    new AnalysisRequestError('Wrong code for status', 429, { code: 'provider_unavailable', canRetry: true }),
    new AnalysisRequestError('Denied', 403, { code: 'provider_unavailable', canRetry: true }),
    new AnalysisRequestError('Timed out', 0, { code: 'client_timeout', canRetry: true }),
    new AnalysisRequestError('Invalid output', 502),
    new Error('Network failure'),
  ];
  for (const failure of failures) {
    const { clock, dependencies } = fakeEnvironment();
    const controller = new AnalysisController('member', dependencies);
    let calls = 0;
    await assert.rejects(controller.run(async () => {
      calls++;
      throw failure;
    }), (error: unknown) => error === failure);
    assert.equal(calls, 1);
    assert.equal(clock.now, 0);
  }
});

test('manual calls are serialized and spaced fifteen seconds after each request completes', async () => {
  const { clock, dependencies } = fakeEnvironment();
  const controller = new AnalysisController('member', dependencies);
  const startedAt: number[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const request = async () => {
    startedAt.push(clock.now);
    maxInFlight = Math.max(maxInFlight, ++inFlight);
    await dependencies.sleep(2000);
    inFlight--;
    return startedAt.length;
  };
  await Promise.all([controller.run(request), controller.run(request), controller.run(request)]);
  assert.equal(maxInFlight, 1);
  assert.deepEqual(startedAt, [0, 17_000, 34_000]);
});

test('a local cache result honors a preceding HTTP cooldown without extending it', async () => {
  const { clock, storage, dependencies } = fakeEnvironment();
  const controller = new AnalysisController('member', dependencies);
  const httpStarts: number[] = [];
  await controller.run(async () => { httpStarts.push(clock.now); });
  const precedingCooldown = JSON.parse([...storage.values.values()][0]).nextAllowedAt;
  let localResult = false;
  const result = await controller.run(async () => {
    assert.equal(clock.now, precedingCooldown);
    localResult = true;
    return 'cached diagnostic';
  }, { isLocalResult: () => localResult });
  assert.equal(result, 'cached diagnostic');
  assert.equal(JSON.parse([...storage.values.values()][0]).nextAllowedAt, precedingCooldown);
  await controller.run(async () => { httpStarts.push(clock.now); });
  assert.deepEqual(httpStarts, [0, 15_000]);
});

test('shared browser locks and cooldown storage serialize separate controllers for one account', async () => {
  const { clock, dependencies } = fakeEnvironment();
  const locks = new Map<string, Promise<void>>();
  dependencies.withLock = <T>(name: string, task: () => Promise<T>) => {
    const previous = locks.get(name) ?? Promise.resolve();
    const operation = previous.then(task);
    locks.set(name, operation.then(() => undefined, () => undefined));
    return operation;
  };
  const first = new AnalysisController('member', dependencies);
  const second = new AnalysisController('member', dependencies);
  const attempts: number[] = [];
  await Promise.all([first, second].map((controller) => controller.run(async () => {
    attempts.push(clock.now);
  })));
  assert.deepEqual(attempts, [0, 15_000]);
});

test('an abort during pacing makes no request and does not extend the stored cooldown', async () => {
  const { clock, storage, dependencies } = fakeEnvironment();
  const controller = new AnalysisController('member', dependencies);
  await controller.run(async () => 'first');
  const abort = new AbortController();
  dependencies.sleep = async (milliseconds) => {
    clock.now += milliseconds;
    abort.abort();
  };
  const waitingController = new AnalysisController('member', dependencies);
  let calls = 0;
  await assert.rejects(waitingController.run(async () => {
    calls++;
  }, { signal: abort.signal }), AnalysisCancelledError);
  assert.equal(calls, 0);
  assert.equal(JSON.parse([...storage.values.values()][0]).nextAllowedAt, 15_000);
});

test('an already-aborted queued request leaves the preceding request cooldown intact', async () => {
  const { storage, dependencies } = fakeEnvironment();
  const controller = new AnalysisController('member', dependencies);
  let release: () => void = () => undefined;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  const first = controller.run(async () => { await blocked; });
  const abort = new AbortController();
  let calls = 0;
  const second = controller.run(async () => { calls++; }, { signal: abort.signal });
  abort.abort();
  release();
  await first;
  await assert.rejects(second, AnalysisCancelledError);
  assert.equal(calls, 0);
  assert.equal(JSON.parse([...storage.values.values()][0]).nextAllowedAt, 15_000);
});

test('storage failures leave per-instance pacing operational', async () => {
  const { clock, dependencies } = fakeEnvironment();
  dependencies.storage = {
    getItem: () => { throw new Error('Blocked'); },
    setItem: () => { throw new Error('Blocked'); },
  };
  const controller = new AnalysisController('member', dependencies);
  const attempts: number[] = [];
  await controller.run(async () => { attempts.push(clock.now); });
  await controller.run(async () => { attempts.push(clock.now); });
  assert.deepEqual(attempts, [0, 15_000]);
});

test('Pacific daily reset calculations follow both daylight-saving changes', () => {
  const cases = [
    ['2026-03-08T07:30:00Z', '2026-03-08T08:01:00Z'],
    ['2026-03-08T10:30:00Z', '2026-03-09T07:01:00Z'],
    ['2026-11-01T08:30:00Z', '2026-11-02T08:01:00Z'],
    ['2026-11-01T09:30:00Z', '2026-11-02T08:01:00Z'],
  ];
  for (const [now, resetAt] of cases) {
    assert.equal(new Date(nextPacificQuotaResetAt(Date.parse(now))).toISOString(), new Date(resetAt).toISOString());
  }
});
