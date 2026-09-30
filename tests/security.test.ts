import assert from 'node:assert/strict';
import test from 'node:test';
import analyzeRoute from '../api/analyze';
import meRoute from '../api/me';
import { getMemberKey } from '../api/_lib/auth.js';
import { analyzePhoto, resolveFallbackModel, validateResult, withGeminiFallback } from '../api/_lib/analyze.js';
import { HttpError, publicError, publicErrorHeaders } from '../api/_lib/httpError.js';
import { getProviderStatus, providerError } from '../api/_lib/providerFailure.js';

test('the API rejects callers without a verified identity', async () => {
  const analyze = await analyzeRoute.fetch(new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }));
  const me = await meRoute.fetch(new Request('http://localhost/api/me'));
  assert.equal(analyze.status, 401);
  assert.equal(me.status, 401);
});

test('member keys are selected only by the requested Firebase uid', () => {
  const original = process.env.GEMINI_KEYS_BY_UID;
  process.env.GEMINI_KEYS_BY_UID = JSON.stringify({ memberA: 'key-a', memberB: 'key-b' });
  try {
    assert.equal(getMemberKey('memberA'), 'key-a');
    assert.equal(getMemberKey('memberB'), 'key-b');
    assert.equal(getMemberKey('unknown'), null);
  } finally {
    if (original === undefined) delete process.env.GEMINI_KEYS_BY_UID;
    else process.env.GEMINI_KEYS_BY_UID = original;
  }
});

test('invalid images are rejected before any Gemini call', async () => {
  await assert.rejects(
    analyzePhoto({ imageBase64: 'AAAA', mimeType: 'image/jpeg' }, 'unused-test-key'),
    (error: unknown) => error instanceof HttpError && error.status === 400
  );
});

test('a transient primary model failure uses the configured fallback model', async () => {
  const models: string[] = [];
  const result = await withGeminiFallback(async (model) => {
    models.push(model);
    if (model === 'primary') throw Object.assign(new Error('Unavailable'), { status: 503 });
    return 'diagnostic';
  }, 'primary', 'fallback');

  assert.equal(result, 'diagnostic');
  assert.deepEqual(models, ['primary', 'fallback']);
});

test('the deprecated Gemini 2.5 fallback is migrated for new projects', () => {
  assert.equal(resolveFallbackModel(undefined), 'gemini-3.5-flash-lite');
  assert.equal(resolveFallbackModel(' gemini-2.5-flash '), 'gemini-3.5-flash-lite');
  assert.equal(resolveFallbackModel('gemini-3.5-flash'), 'gemini-3.5-flash');
});

test('quota and authorization failures never use the fallback model', async () => {
  for (const status of [401, 403, 429]) {
    const models: string[] = [];
    await assert.rejects(
      withGeminiFallback(async (model) => {
        models.push(model);
        throw Object.assign(new Error('Rejected'), { status });
      }, 'primary', 'fallback'),
      (error: unknown) => error instanceof Error && 'status' in error && error.status === status
    );
    assert.deepEqual(models, ['primary']);
  }
});

function quotaFailure(quotaIds: string[], retryDelay?: string): Record<string, unknown> {
  return {
    code: 429,
    status: 'RESOURCE_EXHAUSTED',
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: quotaIds.map((quotaId) => ({
          quotaId,
          quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests',
        })),
      },
      ...(retryDelay ? [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay }] : []),
    ],
  };
}

test('daily Google quotas stop even when Google also supplies RetryInfo', () => {
  const detail = quotaFailure(['GenerateRequestsPerDayPerProjectPerModel-FreeTier'], '12s');
  for (const error of [detail, { error: detail }, Object.assign(new Error(JSON.stringify({ error: detail })), { status: 429 })]) {
    const response = publicError(providerError(error, '5'));
    assert.equal(response.status, 429);
    assert.equal(response.code, 'quota_daily');
    assert.equal(response.canRetry, false);
    assert.equal(response.retryAfterSeconds, undefined);
    assert.deepEqual(publicErrorHeaders(response), {});
  }
});

test('minute request and token quotas respect structured retry delays', () => {
  for (const quotaId of ['GenerateRequestsPerMinutePerProjectPerModel-FreeTier', 'GenerateContentInputTokensPerModelPerMinute']) {
    const response = publicError(providerError({ error: quotaFailure([quotaId], '8.4s') }, '10'));
    assert.equal(response.code, 'rate_limit');
    assert.equal(response.canRetry, true);
    assert.equal(response.retryAfterSeconds, 10);
    assert.deepEqual(publicErrorHeaders(response), { 'Retry-After': '10' });
  }
  assert.equal(publicError(providerError(quotaFailure(['GenerateRequestsPerMinute']))).retryAfterSeconds, 60);
});

test('unidentified or mixed quota windows do not trigger automatic retries', () => {
  for (const error of [
    { status: 429, message: 'Quota exceeded for this project' },
    quotaFailure(['unknown-quota'], '5s'),
    quotaFailure(['GenerateRequestsPerMinute', 'unknown-quota'], '5s'),
  ]) {
    const response = publicError(providerError(error, '5'));
    assert.equal(response.code, 'quota_unknown');
    assert.equal(response.canRetry, false);
    assert.equal(response.retryAfterSeconds, undefined);
  }
  assert.equal(publicError(providerError(quotaFailure(['GenerateRequestsPerMinute', 'GenerateRequestsPerDay']))).code, 'quota_daily');
});

test('provider metadata exposes only safe allowlisted fields', () => {
  const secret = 'private-key-and-provider-message';
  const error = new HttpError(503, 'Temporary failure', {
    code: 'provider_unavailable', canRetry: true, retryAfterSeconds: 30,
    apiKey: secret, rawMessage: secret, photo: secret, uid: secret,
  } as any);
  const response = publicError(error);
  assert.deepEqual(Object.keys(response).sort(), ['canRetry', 'code', 'error', 'retryAfterSeconds', 'status']);
  assert.ok(!JSON.stringify(response).includes(secret));
  const unknown = publicError(new HttpError(429, 'Limit', { code: secret, canRetry: true } as any));
  assert.deepEqual(unknown, { status: 429, error: 'Limit' });
  for (const status of [503, 504]) {
    const mapped = publicError(providerError({ status, message: secret }));
    assert.equal(mapped.code, 'provider_unavailable');
    assert.equal(mapped.retryAfterSeconds, 30);
    assert.ok(!JSON.stringify(mapped).includes(secret));
  }
  assert.equal(getProviderStatus(new Error(JSON.stringify({ error: { code: 503 } }))), 503);
});

test('cancellation after a transient error prevents any fallback request', async () => {
  const controller = new AbortController();
  const models: string[] = [];
  await assert.rejects(withGeminiFallback(async (model) => {
    models.push(model);
    controller.abort();
    throw { status: 503 };
  }, 'primary', 'fallback', undefined, controller.signal), (error: unknown) => error instanceof Error && error.name === 'AbortError');
  assert.deepEqual(models, ['primary']);
});

test('the fallback error is preserved when both Gemini models are unavailable', async () => {
  const fallbackFailure = Object.assign(new Error('Fallback unavailable'), { status: 504 });
  await assert.rejects(
    withGeminiFallback(async (model) => {
      if (model === 'primary') throw Object.assign(new Error('Primary unavailable'), { status: 503 });
      throw fallbackFailure;
    }, 'primary', 'fallback'),
    (error: unknown) => error === fallbackFailure
  );
});

const conciseDiagnostic = {
  statut_analyse: 'constat photographique indicatif',
  priorite: 'Curatif Niveau 2',
  famille: 'Façades extérieures',
  localisation: 'Façade extérieure visible sur la photo',
  perimetre: 'partie commune',
  etat_observations: 'Une fissure est visible sur la façade.',
  intervention: 'Programmer un contrôle de la façade avant de définir les travaux.',
  cout_estime_min_ttc_eur: 0,
  cout_estime_max_ttc_eur: 0,
  confiance: 'moyen',
};

test('the report-style diagnostic contract accepts the essential PPPT fields', () => {
  assert.deepEqual(validateResult(conciseDiagnostic), conciseDiagnostic);
  const priced = { ...conciseDiagnostic, cout_estime_min_ttc_eur: 1200, cout_estime_max_ttc_eur: 2000 };
  assert.deepEqual(validateResult(priced), priced);
});

test('maintenance and uncertain results cannot carry an invented cost', () => {
  for (const priority of ['Entretien', 'Signalement hors PPPT à vérifier', 'À confirmer / expertise nécessaire']) {
    assert.throws(
      () => validateResult({ ...conciseDiagnostic, priorite: priority, cout_estime_min_ttc_eur: 100, cout_estime_max_ttc_eur: 200 }),
      (error: unknown) => error instanceof HttpError && error.status === 502
    );
  }
});

test('an unusable image can be returned without inventing a priority', () => {
  const unusable = {
    ...conciseDiagnostic,
    statut_analyse: 'image non exploitable',
    priorite: 'À confirmer / expertise nécessaire',
    famille: 'Non déterminable',
    localisation: 'Localisation précise à confirmer sur site',
    perimetre: 'indéterminé',
    etat_observations: 'L’image est trop floue pour identifier l’ouvrage.',
    intervention: 'Demander une nouvelle photo nette ou réaliser une visite.',
    confiance: 'faible',
  };
  assert.deepEqual(validateResult(unusable), unusable);
  assert.throws(
    () => validateResult({ ...unusable, priorite: 'Curatif Niveau 1' }),
    (error: unknown) => error instanceof HttpError && error.status === 502
  );
});

test('unknown priorities and malformed report fields are rejected', () => {
  for (const invalid of [
    { ...conciseDiagnostic, priorite: 'Signalement' },
    { ...conciseDiagnostic, famille: '' },
    { ...conciseDiagnostic, etat_observations: '' },
    { ...conciseDiagnostic, intervention: ['inspection'] },
    { ...conciseDiagnostic, cout_estime_min_ttc_eur: -1 },
    { ...conciseDiagnostic, cout_estime_min_ttc_eur: 1500, cout_estime_max_ttc_eur: 1000 },
    { ...conciseDiagnostic, cout_estime_min_ttc_eur: 0, cout_estime_max_ttc_eur: 1000 },
  ]) {
    assert.throws(
      () => validateResult(invalid),
      (error: unknown) => error instanceof HttpError && error.status === 502
    );
  }
});

const validPhoto = { imageBase64: '/9j/2w==', mimeType: 'image/jpeg' };

function geminiResponse(diagnostic = conciseDiagnostic): Response {
  return Response.json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(diagnostic) }] }, finishReason: 'STOP' }] });
}

test('photos without a declared location send explicit neutral context and keep the JSON response', async (t) => {
  const requests: any[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(await new Request(input, init).json());
    return geminiResponse();
  });
  for (const photo of [validPhoto, { ...validPhoto, localisation: 'non renseignée' }]) {
    assert.deepEqual(await analyzePhoto(photo, 'unused-test-key'), conciseDiagnostic);
  }
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].contents, requests[1].contents);
  const responseSchema = requests[0].generationConfig?.responseSchema;
  assert.ok(responseSchema);
  assert.deepEqual(responseSchema.required, [
    'statut_analyse', 'priorite', 'famille', 'localisation', 'perimetre',
    'etat_observations', 'intervention', 'cout_estime_min_ttc_eur',
    'cout_estime_max_ttc_eur', 'confiance',
  ]);
  assert.equal(responseSchema.properties.remarque_technique, undefined);
  assert.ok(requests[0].contents.flatMap((content: any) => content.parts).some((part: any) => part.inlineData?.data === validPhoto.imageBase64));
  assert.match(
    JSON.stringify(requests[0].contents),
    /Localisation déclarée.*Non renseignée.*Ne déduis pas le périmètre/
  );
});

test('each photo carries its own declared location in a single Gemini request', async (t) => {
  const requests: any[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(await new Request(input, init).json());
    return geminiResponse();
  });
  await analyzePhoto({ ...validPhoto, localisation: 'partie commune' }, 'unused-test-key');
  await analyzePhoto({ ...validPhoto, localisation: 'partie privative' }, 'unused-test-key');
  assert.equal(requests.length, 2);
  assert.match(JSON.stringify(requests[0].contents), /Localisation déclarée.*Parties communes/);
  assert.match(JSON.stringify(requests[1].contents), /Localisation déclarée.*Parties privatives/);
  assert.ok(!JSON.stringify(requests[0].contents).includes('Parties privatives'));
});

test('invalid locations are rejected before consuming any Gemini request', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => geminiResponse());
  for (const localisation of [null, '', 'hall', false, {}, ['partie commune']]) {
    await assert.rejects(
      analyzePhoto({ ...validPhoto, localisation }, 'unused-test-key'),
      (error: unknown) => error instanceof HttpError && error.status === 400
    );
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('recovery calls use only the fixed fallback and reject invalid recovery options', async (t) => {
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(new Request(input, init).url);
    return geminiResponse();
  });
  await analyzePhoto({ ...validPhoto, recoveryAttempt: true, model: 'untrusted-model', apiKey: 'untrusted-key' }, 'unused-test-key');
  assert.equal(urls.length, 1);
  assert.ok(urls[0].includes(resolveFallbackModel(process.env.GEMINI_FALLBACK_MODEL)));
  assert.ok(!urls[0].includes('untrusted'));
  for (const recoveryAttempt of ['true', 1, null, {}, []]) {
    await assert.rejects(analyzePhoto({ ...validPhoto, recoveryAttempt }, 'unused-test-key'),
      (error: unknown) => error instanceof HttpError && error.status === 400);
  }
  assert.equal(urls.length, 1);
});

test('an aborted request spends no Gemini call', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => geminiResponse());
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(analyzePhoto(validPhoto, 'unused-test-key', controller.signal),
    (error: unknown) => error instanceof HttpError && error.metadata?.code === 'request_aborted');
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('Retry-After from the provider survives SDK error wrapping safely', async (t) => {
  t.mock.method(console, 'error', () => undefined);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({
    error: quotaFailure(['GenerateRequestsPerMinute'], '3s'),
  }, { status: 429, headers: { 'Retry-After': '7' } }));
  await assert.rejects(analyzePhoto(validPhoto, 'unused-test-key'), (error: unknown) => {
    if (!(error instanceof HttpError)) return false;
    assert.equal(error.metadata?.code, 'rate_limit');
    assert.equal(error.metadata?.retryAfterSeconds, 7);
    return true;
  });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('model deadlines bound both provider attempts and propagate SDK abort signals', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(console, 'error', () => undefined);
  const requests: Request[] = [];
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push(request);
    return new Promise<Response>((_resolve, reject) => {
      request.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  });
  const pending = analyzePhoto(validPhoto, 'unused-test-key');
  const failure = assert.rejects(pending, (error: unknown) => error instanceof HttpError && error.metadata?.code === 'provider_unavailable');
  // SDK parameter/header conversion is asynchronous, but no real network is used.
  for (let i = 0; i < 50 && requests.length < 1; i++) await Promise.resolve();
  assert.equal(requests.length, 1);
  t.mock.timers.tick(25_000);
  for (let i = 0; i < 50 && requests.length < 2; i++) await Promise.resolve();
  assert.equal(requests.length, 2);
  assert.equal(requests[0].signal.aborted, true);
  t.mock.timers.tick(25_000);
  await failure;
  assert.equal(requests[1].signal.aborted, true);
  assert.ok(requests.every((request) => request.headers.get('x-server-timeout') === '25'));
});

test('provider failure telemetry is allowlisted and identifies the declared location', async (t) => {
  const logs: unknown[][] = [];
  const apiKey = 'test-secret-gemini-key';
  t.mock.method(console, 'error', (...args: unknown[]) => {
    logs.push(args);
  });
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    error: {
      code: 429,
      message: `${apiKey} ${validPhoto.imageBase64} provider message that must not be logged`,
    },
  }, { status: 429 }));

  await assert.rejects(
    analyzePhoto({ ...validPhoto, localisation: 'non renseignée' }, apiKey),
    (error: unknown) => error instanceof HttpError && error.status === 429
  );

  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], '[Gemini] analysis event');
  const event = logs[0][1] as Record<string, unknown>;
  assert.deepEqual(Object.keys(event).sort(), ['localisation', 'model', 'outcome', 'stage', 'upstreamStatus']);
  assert.equal(event.outcome, 'attempt_failed');
  assert.equal(event.localisation, 'non renseignée');
  assert.equal(event.stage, 'provider');
  assert.equal(event.upstreamStatus, 429);
  assert.equal(typeof event.model, 'string');
  assert.ok(!JSON.stringify(logs).includes(apiKey));
  assert.ok(!JSON.stringify(logs).includes(validPhoto.imageBase64));
  assert.ok(!JSON.stringify(logs).includes('provider message that must not be logged'));
});

test('contract failure telemetry contains no Gemini response content', async (t) => {
  const logs: unknown[][] = [];
  const distinctiveResponseText = 'This diagnostic text must not appear in telemetry.';
  t.mock.method(console, 'error', (...args: unknown[]) => {
    logs.push(args);
  });
  t.mock.method(globalThis, 'fetch', async () => geminiResponse({
    ...conciseDiagnostic,
    priorite: 'Invalid priority',
    etat_observations: distinctiveResponseText,
  }));

  await assert.rejects(
    analyzePhoto({ ...validPhoto, localisation: 'non renseignée' }, 'unused-test-key'),
    (error: unknown) => error instanceof HttpError && error.status === 502
  );

  assert.equal(logs.length, 1);
  const event = logs[0][1] as Record<string, unknown>;
  assert.equal(event.outcome, 'attempt_failed');
  assert.equal(event.localisation, 'non renseignée');
  assert.equal(event.stage, 'response_contract');
  assert.equal(typeof event.model, 'string');
  assert.ok(!JSON.stringify(logs).includes(distinctiveResponseText));
  assert.ok(!JSON.stringify(logs).includes(validPhoto.imageBase64));
});

test('the fallback preserves photo context and a serious private-to-common risk priority', async (t) => {
  const requests: { url: string; body: any }[] = [];
  const seriousDiagnostic = {
    ...conciseDiagnostic,
    priorite: 'Curatif Niveau 1',
    perimetre: 'partie privative',
    etat_observations: 'Le désordre pourrait affecter un réseau collectif, à vérifier sur site.',
  };
  t.mock.method(console, 'error', () => undefined);
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push({ url: request.url, body: await request.json() });
    return requests.length === 1
      ? Response.json({ error: { code: 503, message: 'Unavailable', status: 'UNAVAILABLE' } }, { status: 503 })
      : geminiResponse(seriousDiagnostic);
  });
  assert.deepEqual(await analyzePhoto({ ...validPhoto, localisation: 'partie privative' }, 'unused-test-key'), seriousDiagnostic);
  assert.equal(requests.length, 2);
  assert.notEqual(requests[0].url, requests[1].url);
  assert.deepEqual(requests[0].body.contents, requests[1].body.contents);
  assert.match(JSON.stringify(requests[1].body.contents), /Localisation déclarée.*Parties privatives/);
});
