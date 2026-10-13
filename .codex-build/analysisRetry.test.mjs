// tests/analysisRetry.test.ts
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
function httpStatus(error) {
  if (typeof error !== "object" || error === null || !("status" in error)) return void 0;
  const status = error.status;
  return typeof status === "number" ? status : void 0;
}
function shouldPauseBatch(error) {
  return [401, 403, 429, 503, 504].includes(httpStatus(error) ?? -1) || error instanceof AnalysisRequestError && ["client_timeout", "network_error"].includes(error.code ?? "");
}
function batchPauseMessage(error) {
  if (error instanceof AnalysisRequestError) {
    if (error.status === 429 && error.code === "quota_daily") {
      return "Analyse suspendue : le quota journalier Gemini de ce projet est \xE9puis\xE9. Reprise apr\xE8s sa r\xE9initialisation \xE0 minuit, heure du Pacifique. Les r\xE9sultats obtenus sont conserv\xE9s.";
    }
    if (error.status === 429 && error.code === "rate_limit") {
      return "Analyse suspendue : la limite de d\xE9bit Gemini est atteinte. Attendez avant de reprendre. Les r\xE9sultats obtenus sont conserv\xE9s.";
    }
    if (error.status === 429) {
      return "Analyse suspendue : une limite Gemini est atteinte. V\xE9rifiez le quota de ce projet dans Google AI Studio avant de reprendre. Les r\xE9sultats obtenus sont conserv\xE9s.";
    }
    if (error.code === "client_timeout") {
      return "Analyse suspendue : la requ\xEAte a d\xE9pass\xE9 sa dur\xE9e pr\xE9vue. Attendez avant de r\xE9essayer cette photo. Les r\xE9sultats obtenus sont conserv\xE9s.";
    }
    if (error.code === "network_error") {
      return "Analyse suspendue : connexion interrompue, v\xE9rifiez votre connexion avant de reprendre. Les r\xE9sultats obtenus sont conserv\xE9s.";
    }
  }
  if ([503, 504].includes(httpStatus(error) ?? -1)) {
    return "Analyse suspendue : Gemini reste temporairement indisponible. R\xE9essayez plus tard. Les r\xE9sultats obtenus sont conserv\xE9s.";
  }
  return "Analyse suspendue : v\xE9rifiez votre acc\xE8s Gemini avant de reprendre. Les r\xE9sultats obtenus sont conserv\xE9s.";
}
function isResultOutdated(item) {
  return Boolean(item.result) && (item.localisation ?? "non renseign\xE9e") !== (item.analyzedLocalisation ?? "non renseign\xE9e");
}
function canRestoreCompletedResult(item, localisation) {
  return item.status === "error" && Boolean(item.result) && localisation === (item.analyzedLocalisation ?? "non renseign\xE9e");
}
function selectRemainingIndices(items) {
  const remaining = [];
  items.forEach((item, index) => {
    if (item.status !== "completed" || isResultOutdated(item)) remaining.push(index);
  });
  return remaining;
}

// tests/analysisRetry.test.ts
test("batch pauses for authentication, quota and provider unavailability", () => {
  for (const status of [401, 403, 429, 503, 504]) {
    assert.equal(shouldPauseBatch(new AnalysisRequestError("Pause", status)), true);
  }
  for (const status of [400, 413, 502]) {
    assert.equal(shouldPauseBatch(new AnalysisRequestError("Continue", status)), false);
  }
  assert.equal(shouldPauseBatch(new Error("Network error")), false);
  assert.equal(shouldPauseBatch(new AnalysisRequestError("Timeout", 0, { code: "client_timeout" })), true);
  assert.equal(shouldPauseBatch(new AnalysisRequestError("Offline", 0, { code: "network_error" })), true);
});
test("retry metadata accepts only known codes and finite positive delays", () => {
  const confirmed = new AnalysisRequestError("Rate limit", 429, {
    code: "rate_limit",
    retryAfterSeconds: 75,
    canRetry: true
  });
  assert.equal(confirmed.code, "rate_limit");
  assert.equal(confirmed.retryAfterSeconds, 75);
  assert.equal(confirmed.canRetry, true);
  const unsafe = new AnalysisRequestError("Failure", 429, {
    code: "unexpected-provider-code",
    retryAfterSeconds: Infinity
  });
  assert.equal(unsafe.code, void 0);
  assert.equal(unsafe.retryAfterSeconds, void 0);
  assert.equal(unsafe.canRetry, false);
});
test("batch pause messages distinguish daily quota, rate limit and unknown quota", () => {
  assert.match(batchPauseMessage(new AnalysisRequestError("Daily", 429, { code: "quota_daily" })), /quota journalier/);
  assert.match(batchPauseMessage(new AnalysisRequestError("Rate", 429, { code: "rate_limit" })), /limite de débit/);
  assert.match(batchPauseMessage(new AnalysisRequestError("Unknown", 429, { code: "quota_unknown" })), /Google AI Studio/);
  assert.match(batchPauseMessage(new AnalysisRequestError("Timeout", 0, { code: "client_timeout" })), /durée prévue/);
  assert.match(batchPauseMessage(new AnalysisRequestError("Offline", 504, { code: "network_error" })), /connexion interrompue, vérifiez votre connexion/);
  assert.match(batchPauseMessage(new AnalysisRequestError("Unavailable", 503)), /temporairement indisponible/);
});
test("a resumed mixed lot includes changed locations while keeping current results", () => {
  const retainedResult = { constat: "R\xE9sultat conserv\xE9." };
  const items = [
    { status: "completed", result: retainedResult, localisation: "partie commune", analyzedLocalisation: "partie commune" },
    { status: "completed", result: retainedResult, localisation: "partie privative", analyzedLocalisation: "partie commune" },
    { status: "error", localisation: "partie privative" },
    { status: "pending", localisation: "partie commune" },
    { status: "completed", result: retainedResult }
  ];
  assert.deepEqual(selectRemainingIndices(items), [1, 2, 3]);
  assert.equal(items[1].result, retainedResult);
  assert.equal(items[2].localisation, "partie privative");
  assert.equal(isResultOutdated(items[4]), false);
});
test("restoring the location used by a completed diagnostic removes the need for another call", () => {
  const item = { status: "error", result: {}, localisation: "partie privative", analyzedLocalisation: "partie commune" };
  assert.equal(isResultOutdated(item), true);
  assert.equal(canRestoreCompletedResult(item, "partie commune"), true);
  const restored = { ...item, localisation: "partie commune", status: "completed" };
  assert.equal(isResultOutdated(restored), false);
  assert.deepEqual(selectRemainingIndices([restored]), []);
  assert.equal(restored.result, item.result);
});
test("a failed refresh stays retryable while its selected location differs from the retained result", () => {
  const item = { status: "error", result: {}, localisation: "partie privative", analyzedLocalisation: "partie commune" };
  assert.equal(canRestoreCompletedResult(item, "partie privative"), false);
  assert.deepEqual(selectRemainingIndices([item]), [0]);
});
test("resuming a lot excludes only completed photos", () => {
  const items = [
    { status: "completed" },
    { status: "error" },
    { status: "pending" },
    { status: "analyzing" },
    { status: "completed" }
  ];
  assert.deepEqual(selectRemainingIndices(items), [1, 2, 3]);
  assert.equal(items[0].status, "completed");
});
