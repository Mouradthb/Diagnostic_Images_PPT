import assert from 'node:assert/strict';
import test from 'node:test';
import analyzeRoute from '../api/analyze';
import meRoute from '../api/me';
import { getMemberKey } from '../api/_lib/auth.js';
import { analyzePhoto, resolveFallbackModel, validateResult, withGeminiFallback } from '../api/_lib/analyze.js';
import { HttpError } from '../api/_lib/httpError.js';

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
  for (const status of [403, 429]) {
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
  domaines: ['façade'],
  perimetre: 'partie commune',
  constat: 'Une fissure est visible sur la façade.',
  risque: 'La fissure pourrait s’étendre, à confirmer sur site.',
  action: 'Programmer un contrôle de la façade.',
  verification: 'Inspecter la façade sur site.',
  confiance: 'moyen',
  limites: 'La profondeur de la fissure ne peut être mesurée sur la photo.',
};

test('the concise diagnostic contract accepts the essential PPPT fields', () => {
  assert.deepEqual(validateResult(conciseDiagnostic), conciseDiagnostic);
});

test('an unusable image can be returned without inventing a priority', () => {
  const unusable = {
    ...conciseDiagnostic,
    statut_analyse: 'image non exploitable',
    priorite: 'À confirmer / expertise nécessaire',
    domaines: [],
    perimetre: 'indéterminé',
    constat: 'L’image est trop floue pour identifier l’ouvrage.',
    risque: 'Non déterminable sur image seule.',
    action: 'Demander une nouvelle photo nette.',
    verification: 'Réaliser une visite si une nouvelle photo est impossible.',
    confiance: 'faible',
    limites: 'Ouvrage et désordre non identifiables.',
  };
  assert.deepEqual(validateResult(unusable), unusable);
  assert.throws(
    () => validateResult({ ...unusable, priorite: 'Curatif Niveau 1' }),
    (error: unknown) => error instanceof HttpError && error.status === 502
  );
});

test('unknown priorities and malformed concise fields are rejected', () => {
  for (const invalid of [
    { ...conciseDiagnostic, priorite: 'Signalement' },
    { ...conciseDiagnostic, domaines: ['façade', 'toiture', 'réseau', 'ventilation'] },
    { ...conciseDiagnostic, constat: '' },
    { ...conciseDiagnostic, verification: ['inspection'] },
  ]) {
    assert.throws(
      () => validateResult(invalid),
      (error: unknown) => error instanceof HttpError && error.status === 502
    );
  }
});
