// tests/analysisControl.test.ts
import assert from "node:assert/strict";
import test from "node:test";

// src/utils/analysisRetry.ts
var ANALYSIS_ERROR_CODES = [
  "quota_daily",
  "rate_limit",
  "quota_unknown",
  "provider_unavailable",
  "request_aborted",
  "client_timeout",
  "network_error"
];
var AnalysisRequestError = class extends Error {
  constructor(message, status, options = {}) {
    super(message);
    this.name = "AnalysisRequestError";
    this.status = status;
    if (ANALYSIS_ERROR_CODES.includes(options.code)) {
      this.code = options.code;
    }
    if (typeof options.retryAfterSeconds === "number" && Number.isFinite(options.retryAfterSeconds) && options.retryAfterSeconds > 0 && options.retryAfterSeconds <= Number.MAX_SAFE_INTEGER / 1e3) {
      this.retryAfterSeconds = options.retryAfterSeconds;
    }
    this.canRetry = options.canRetry === true;
  }
};

// src/utils/analysisControl.ts
var REQUEST_SPACING_MS = 15e3;
var MAX_AUTOMATIC_WAIT_MS = 12e4;
var AnalysisCancelledError = class extends Error {
  constructor() {
    super("L'analyse a \xE9t\xE9 arr\xEAt\xE9e.");
    this.name = "AnalysisCancelledError";
  }
};
function throwIfAborted(signal) {
  if (signal?.aborted) throw new AnalysisCancelledError();
}
function abortableSleep(milliseconds, signal) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(new AnalysisCancelledError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
function browserStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
async function browserLock(name, task, signal) {
  throwIfAborted(signal);
  if (typeof navigator === "undefined" || !navigator.locks?.request) return task();
  let taskStarted = false;
  try {
    return await navigator.locks.request(name, { mode: "exclusive", ...signal ? { signal } : {} }, () => {
      taskStarted = true;
      throwIfAborted(signal);
      return task();
    });
  } catch (error) {
    throwIfAborted(signal);
    if (!taskStarted && error instanceof DOMException && ["SecurityError", "NotSupportedError"].includes(error.name)) {
      return task();
    }
    throw error;
  }
}
var pacificFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23"
});
function pacificParts(timestamp) {
  const parts = {};
  for (const part of pacificFormatter.formatToParts(timestamp)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return parts;
}
function nextPacificQuotaResetAt(now) {
  const today = pacificParts(now);
  const nextMidnightWallClock = Date.UTC(today.year, today.month - 1, today.day + 1);
  let midnight = nextMidnightWallClock + 8 * 60 * 60 * 1e3;
  for (let iteration = 0; iteration < 3; iteration++) {
    const local = pacificParts(midnight);
    const wallClock = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const offset = wallClock - Math.floor(midnight / 1e3) * 1e3;
    midnight = nextMidnightWallClock - offset;
  }
  return midnight + 6e4;
}
var AnalysisController = class {
  constructor(ownerUid, dependencies = {}) {
    this.queue = Promise.resolve();
    this.state = { nextAllowedAt: 0, dailyResetAt: 0 };
    const account = encodeURIComponent(ownerUid);
    this.storageKey = `diagnostic-analysis-cooldown:${account}`;
    this.lockName = `diagnostic-analysis-request:${account}`;
    this.dependencies = {
      now: dependencies.now ?? Date.now,
      sleep: dependencies.sleep ?? abortableSleep,
      random: dependencies.random ?? Math.random,
      storage: dependencies.storage === void 0 ? browserStorage() : dependencies.storage,
      withLock: dependencies.withLock ?? browserLock
    };
  }
  run(request, options = {}) {
    const operation = this.queue.then(async () => {
      throwIfAborted(options.signal);
      return this.dependencies.withLock(this.lockName, () => this.perform(request, options), options.signal);
    });
    this.queue = operation.then(() => void 0, () => void 0);
    return operation.catch((error) => {
      throwIfAborted(options.signal);
      throw error;
    });
  }
  readState() {
    try {
      const raw = this.dependencies.storage?.getItem(this.storageKey);
      const stored = raw ? JSON.parse(raw) : void 0;
      if (stored && typeof stored === "object" && !Array.isArray(stored)) {
        for (const field of ["nextAllowedAt", "dailyResetAt"]) {
          const value = stored[field];
          if (typeof value === "number" && Number.isFinite(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER) {
            this.state[field] = Math.max(this.state[field], value);
          }
        }
      }
    } catch {
    }
    const now = this.dependencies.now();
    if (this.state.nextAllowedAt <= now) this.state.nextAllowedAt = 0;
    if (this.state.dailyResetAt <= now) this.state.dailyResetAt = 0;
    return this.state;
  }
  saveState() {
    try {
      this.dependencies.storage?.setItem(this.storageKey, JSON.stringify(this.state));
    } catch {
    }
  }
  deferRequests(milliseconds) {
    const state = this.readState();
    state.nextAllowedAt = Math.max(state.nextAllowedAt, this.dependencies.now() + milliseconds);
    this.saveState();
  }
  dailyQuotaError(resetAt) {
    return new AnalysisRequestError(
      "Le quota journalier Gemini est \xE9puis\xE9. Reprise apr\xE8s sa r\xE9initialisation \xE0 minuit, heure du Pacifique.",
      429,
      { code: "quota_daily", canRetry: false, retryAfterSeconds: Math.ceil((resetAt - this.dependencies.now()) / 1e3) }
    );
  }
  async waitUntil(target, reason, options) {
    let remaining = target - this.dependencies.now();
    while (remaining > 0) {
      throwIfAborted(options.signal);
      options.onWait?.(Math.ceil(remaining / 1e3), reason);
      throwIfAborted(options.signal);
      await this.dependencies.sleep(Math.min(remaining, 1e3), options.signal);
      remaining = target - this.dependencies.now();
    }
    throwIfAborted(options.signal);
    options.onWait?.(0, reason);
  }
  async beforeRequest(reason, options) {
    while (true) {
      throwIfAborted(options.signal);
      const state = this.readState();
      if (state.dailyResetAt > this.dependencies.now()) throw this.dailyQuotaError(state.dailyResetAt);
      if (state.nextAllowedAt <= this.dependencies.now()) return;
      await this.waitUntil(state.nextAllowedAt, reason, options);
    }
  }
  recordFailure(error) {
    if (!(error instanceof AnalysisRequestError)) return void 0;
    if (error.status === 429 && error.code === "quota_daily") {
      this.readState().dailyResetAt = nextPacificQuotaResetAt(this.dependencies.now());
      this.saveState();
      return void 0;
    }
    const providerDelay = (error.retryAfterSeconds ?? 0) * 1e3;
    let delayMs;
    let recoveryAttempt = false;
    let confirmedRetry = false;
    if (error.code === "client_timeout" || error.code === "network_error" || error.status === 429) {
      delayMs = Math.max(6e4, providerDelay);
      confirmedRetry = error.status === 429 && error.code === "rate_limit" && error.canRetry;
    } else if ([503, 504].includes(error.status)) {
      const random = this.dependencies.random();
      const jitter = Number.isFinite(random) ? Math.floor(Math.min(1, Math.max(0, random)) * 3e3) : 0;
      delayMs = Math.max(3e4 + jitter, providerDelay);
      confirmedRetry = error.code === "provider_unavailable" && error.canRetry;
      recoveryAttempt = true;
    } else {
      return void 0;
    }
    this.deferRequests(delayMs);
    return { delayMs, automatic: confirmedRetry && delayMs <= MAX_AUTOMATIC_WAIT_MS, recoveryAttempt };
  }
  async attempt(request, recoveryAttempt, options) {
    throwIfAborted(options.signal);
    let value;
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
  async perform(request, options) {
    await this.beforeRequest("pacing", options);
    const first = await this.attempt(request, false, options);
    if (first.success === true) return first.value;
    if (!first.recovery?.automatic) throw first.error;
    await this.beforeRequest("recovery", options);
    const second = await this.attempt(request, first.recovery.recoveryAttempt, options);
    if (second.success === true) return second.value;
    throw second.error;
  }
};

// tests/analysisControl.test.ts
function memoryStorage() {
  const values = /* @__PURE__ */ new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    }
  };
}
function fakeEnvironment(now = 0) {
  const clock = { now };
  const storage = memoryStorage();
  const dependencies = {
    now: () => clock.now,
    sleep: async (milliseconds, signal) => {
      if (signal?.aborted) throw new AnalysisCancelledError();
      clock.now += milliseconds;
    },
    random: () => 0,
    storage,
    withLock: async (_name, task) => task()
  };
  return { clock, storage, dependencies };
}
test("a confirmed 503 waits once then sends exactly one fallback-only recovery", async () => {
  const { clock, dependencies } = fakeEnvironment();
  const controller = new AnalysisController("member", dependencies);
  const attempts = [];
  const waits = [];
  const result = await controller.run(async (recovery) => {
    attempts.push({ recovery, at: clock.now });
    if (attempts.length === 1) {
      throw new AnalysisRequestError("Unavailable", 503, { code: "provider_unavailable", canRetry: true });
    }
    return "diagnostic";
  }, { onWait: (seconds, reason) => waits.push({ seconds, reason }) });
  assert.equal(result, "diagnostic");
  assert.deepEqual(attempts, [{ recovery: false, at: 0 }, { recovery: true, at: 3e4 }]);
  assert.deepEqual(waits[0], { seconds: 30, reason: "recovery" });
  assert.deepEqual(waits.at(-1), { seconds: 0, reason: "recovery" });
});
test("a failed recovery stops at two requests and retains its manual cooldown", async () => {
  const { clock, storage, dependencies } = fakeEnvironment();
  const controller = new AnalysisController("member", dependencies);
  let calls = 0;
  const failure = new AnalysisRequestError("Still unavailable", 504, { code: "provider_unavailable", canRetry: true });
  await assert.rejects(controller.run(async () => {
    calls++;
    throw failure;
  }), (error) => error === failure);
  assert.equal(calls, 2);
  assert.equal(clock.now, 3e4);
  assert.equal(JSON.parse([...storage.values.values()][0]).nextAllowedAt, 6e4);
});
test("daily exhaustion never retries and blocks new controllers until the Pacific reset", async () => {
  const { clock, storage, dependencies } = fakeEnvironment(Date.parse("2026-09-28T18:00:00Z"));
  const controller = new AnalysisController("member", dependencies);
  let calls = 0;
  const failure = new AnalysisRequestError("Daily quota", 429, { code: "quota_daily", canRetry: true });
  await assert.rejects(controller.run(async () => {
    calls++;
    throw failure;
  }), (error) => error === failure);
  const stored = JSON.parse([...storage.values.values()][0]);
  assert.deepEqual(Object.keys(stored).sort(), ["dailyResetAt", "nextAllowedAt"]);
  assert.equal(stored.dailyResetAt, Date.parse("2026-09-29T07:01:00Z"));
  const reloaded = new AnalysisController("member", dependencies);
  await assert.rejects(reloaded.run(async () => {
    calls++;
    return "unexpected";
  }), (error) => error instanceof AnalysisRequestError && error.code === "quota_daily");
  assert.equal(calls, 1);
  clock.now = stored.dailyResetAt;
  assert.equal(await reloaded.run(async () => {
    calls++;
    return "available";
  }), "available");
  assert.equal(calls, 2);
});
test("an unknown 429 never retries automatically and a manual retry waits sixty seconds", async () => {
  const { clock, dependencies } = fakeEnvironment();
  const controller = new AnalysisController("member", dependencies);
  let calls = 0;
  const failure = new AnalysisRequestError("Quota not classified", 429, { code: "quota_unknown", canRetry: true });
  await assert.rejects(controller.run(async () => {
    calls++;
    throw failure;
  }), (error) => error === failure);
  assert.equal(calls, 1);
  assert.equal(clock.now, 0);
  await controller.run(async (recovery) => {
    calls++;
    assert.equal(recovery, false);
    assert.equal(clock.now, 6e4);
  });
  assert.equal(calls, 2);
});
test("a confirmed rate limit honors the provider delay and retries the primary once", async () => {
  const { clock, dependencies } = fakeEnvironment();
  const controller = new AnalysisController("member", dependencies);
  const attempts = [];
  await controller.run(async (recovery) => {
    attempts.push({ recovery, at: clock.now });
    if (attempts.length === 1) {
      throw new AnalysisRequestError("Rate limit", 429, {
        code: "rate_limit",
        retryAfterSeconds: 75,
        canRetry: true
      });
    }
  });
  assert.deepEqual(attempts, [{ recovery: false, at: 0 }, { recovery: false, at: 75e3 }]);
});
test("long provider cooldowns remain manual without sleeping or issuing another request", async () => {
  const { clock, storage, dependencies } = fakeEnvironment();
  const controller = new AnalysisController("member", dependencies);
  let calls = 0;
  const failure = new AnalysisRequestError("Rate limit", 429, {
    code: "rate_limit",
    retryAfterSeconds: 180,
    canRetry: true
  });
  await assert.rejects(controller.run(async () => {
    calls++;
    throw failure;
  }), (error) => error === failure);
  assert.equal(calls, 1);
  assert.equal(clock.now, 0);
  assert.equal(JSON.parse([...storage.values.values()][0]).nextAllowedAt, 18e4);
});
test("a client network failure keeps a sixty-second manual cooldown without automatic recovery", async () => {
  const { clock, storage, dependencies } = fakeEnvironment();
  const controller = new AnalysisController("member", dependencies);
  let calls = 0;
  const failure = new AnalysisRequestError("Connection lost", 504, { code: "network_error", canRetry: true });
  await assert.rejects(controller.run(async () => {
    calls++;
    throw failure;
  }), (error) => error === failure);
  assert.equal(calls, 1);
  assert.equal(clock.now, 0);
  assert.equal(JSON.parse([...storage.values.values()][0]).nextAllowedAt, 6e4);
});
test("unconfirmed, mismatched and non-provider failures do not trigger automatic requests", async () => {
  const failures = [
    new AnalysisRequestError("No confirmation", 503, { code: "provider_unavailable" }),
    new AnalysisRequestError("Wrong code for status", 429, { code: "provider_unavailable", canRetry: true }),
    new AnalysisRequestError("Denied", 403, { code: "provider_unavailable", canRetry: true }),
    new AnalysisRequestError("Timed out", 0, { code: "client_timeout", canRetry: true }),
    new AnalysisRequestError("Invalid output", 502),
    new Error("Network failure")
  ];
  for (const failure of failures) {
    const { clock, dependencies } = fakeEnvironment();
    const controller = new AnalysisController("member", dependencies);
    let calls = 0;
    await assert.rejects(controller.run(async () => {
      calls++;
      throw failure;
    }), (error) => error === failure);
    assert.equal(calls, 1);
    assert.equal(clock.now, 0);
  }
});
test("manual calls are serialized and spaced fifteen seconds after each request completes", async () => {
  const { clock, dependencies } = fakeEnvironment();
  const controller = new AnalysisController("member", dependencies);
  const startedAt = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const request = async () => {
    startedAt.push(clock.now);
    maxInFlight = Math.max(maxInFlight, ++inFlight);
    await dependencies.sleep(2e3);
    inFlight--;
    return startedAt.length;
  };
  await Promise.all([controller.run(request), controller.run(request), controller.run(request)]);
  assert.equal(maxInFlight, 1);
  assert.deepEqual(startedAt, [0, 17e3, 34e3]);
});
test("a local cache result honors a preceding HTTP cooldown without extending it", async () => {
  const { clock, storage, dependencies } = fakeEnvironment();
  const controller = new AnalysisController("member", dependencies);
  const httpStarts = [];
  await controller.run(async () => {
    httpStarts.push(clock.now);
  });
  const precedingCooldown = JSON.parse([...storage.values.values()][0]).nextAllowedAt;
  let localResult = false;
  const result = await controller.run(async () => {
    assert.equal(clock.now, precedingCooldown);
    localResult = true;
    return "cached diagnostic";
  }, { isLocalResult: () => localResult });
  assert.equal(result, "cached diagnostic");
  assert.equal(JSON.parse([...storage.values.values()][0]).nextAllowedAt, precedingCooldown);
  await controller.run(async () => {
    httpStarts.push(clock.now);
  });
  assert.deepEqual(httpStarts, [0, 15e3]);
});
test("shared browser locks and cooldown storage serialize separate controllers for one account", async () => {
  const { clock, dependencies } = fakeEnvironment();
  const locks = /* @__PURE__ */ new Map();
  dependencies.withLock = (name, task) => {
    const previous = locks.get(name) ?? Promise.resolve();
    const operation = previous.then(task);
    locks.set(name, operation.then(() => void 0, () => void 0));
    return operation;
  };
  const first = new AnalysisController("member", dependencies);
  const second = new AnalysisController("member", dependencies);
  const attempts = [];
  await Promise.all([first, second].map((controller) => controller.run(async () => {
    attempts.push(clock.now);
  })));
  assert.deepEqual(attempts, [0, 15e3]);
});
test("an abort during pacing makes no request and does not extend the stored cooldown", async () => {
  const { clock, storage, dependencies } = fakeEnvironment();
  const controller = new AnalysisController("member", dependencies);
  await controller.run(async () => "first");
  const abort = new AbortController();
  dependencies.sleep = async (milliseconds) => {
    clock.now += milliseconds;
    abort.abort();
  };
  const waitingController = new AnalysisController("member", dependencies);
  let calls = 0;
  await assert.rejects(waitingController.run(async () => {
    calls++;
  }, { signal: abort.signal }), AnalysisCancelledError);
  assert.equal(calls, 0);
  assert.equal(JSON.parse([...storage.values.values()][0]).nextAllowedAt, 15e3);
});
test("an already-aborted queued request leaves the preceding request cooldown intact", async () => {
  const { storage, dependencies } = fakeEnvironment();
  const controller = new AnalysisController("member", dependencies);
  let release = () => void 0;
  const blocked = new Promise((resolve) => {
    release = resolve;
  });
  const first = controller.run(async () => {
    await blocked;
  });
  const abort = new AbortController();
  let calls = 0;
  const second = controller.run(async () => {
    calls++;
  }, { signal: abort.signal });
  abort.abort();
  release();
  await first;
  await assert.rejects(second, AnalysisCancelledError);
  assert.equal(calls, 0);
  assert.equal(JSON.parse([...storage.values.values()][0]).nextAllowedAt, 15e3);
});
test("storage failures leave per-instance pacing operational", async () => {
  const { clock, dependencies } = fakeEnvironment();
  dependencies.storage = {
    getItem: () => {
      throw new Error("Blocked");
    },
    setItem: () => {
      throw new Error("Blocked");
    }
  };
  const controller = new AnalysisController("member", dependencies);
  const attempts = [];
  await controller.run(async () => {
    attempts.push(clock.now);
  });
  await controller.run(async () => {
    attempts.push(clock.now);
  });
  assert.deepEqual(attempts, [0, 15e3]);
});
test("Pacific daily reset calculations follow both daylight-saving changes", () => {
  const cases = [
    ["2026-03-08T07:30:00Z", "2026-03-08T08:01:00Z"],
    ["2026-03-08T10:30:00Z", "2026-03-09T07:01:00Z"],
    ["2026-11-01T08:30:00Z", "2026-11-02T08:01:00Z"],
    ["2026-11-01T09:30:00Z", "2026-11-02T08:01:00Z"]
  ];
  for (const [now, resetAt] of cases) {
    assert.equal(new Date(nextPacificQuotaResetAt(Date.parse(now))).toISOString(), new Date(resetAt).toISOString());
  }
});
