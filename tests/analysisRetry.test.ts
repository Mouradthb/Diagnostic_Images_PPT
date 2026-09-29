import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AnalysisRequestError,
  batchPauseMessage,
  canRestoreCompletedResult,
  isResultOutdated,
  selectRemainingIndices,
  shouldPauseBatch,
} from '../src/utils/analysisRetry.ts';

test('batch pauses for authentication, quota and provider unavailability', () => {
  for (const status of [401, 403, 429, 503, 504]) {
    assert.equal(shouldPauseBatch(new AnalysisRequestError('Pause', status)), true);
  }
  for (const status of [400, 413, 502]) {
    assert.equal(shouldPauseBatch(new AnalysisRequestError('Continue', status)), false);
  }
  assert.equal(shouldPauseBatch(new Error('Network error')), false);
  assert.equal(shouldPauseBatch(new AnalysisRequestError('Timeout', 0, { code: 'client_timeout' })), true);
  assert.equal(shouldPauseBatch(new AnalysisRequestError('Offline', 0, { code: 'network_error' })), true);
});

test('retry metadata accepts only known codes and finite positive delays', () => {
  const confirmed = new AnalysisRequestError('Rate limit', 429, {
    code: 'rate_limit', retryAfterSeconds: 75, canRetry: true,
  });
  assert.equal(confirmed.code, 'rate_limit');
  assert.equal(confirmed.retryAfterSeconds, 75);
  assert.equal(confirmed.canRetry, true);
  const unsafe = new AnalysisRequestError('Failure', 429, {
    code: 'unexpected-provider-code', retryAfterSeconds: Infinity,
  });
  assert.equal(unsafe.code, undefined);
  assert.equal(unsafe.retryAfterSeconds, undefined);
  assert.equal(unsafe.canRetry, false);
});

test('batch pause messages distinguish daily quota, rate limit and unknown quota', () => {
  assert.match(batchPauseMessage(new AnalysisRequestError('Daily', 429, { code: 'quota_daily' })), /quota journalier/);
  assert.match(batchPauseMessage(new AnalysisRequestError('Rate', 429, { code: 'rate_limit' })), /limite de débit/);
  assert.match(batchPauseMessage(new AnalysisRequestError('Unknown', 429, { code: 'quota_unknown' })), /Google AI Studio/);
  assert.match(batchPauseMessage(new AnalysisRequestError('Timeout', 0, { code: 'client_timeout' })), /durée prévue/);
  assert.match(batchPauseMessage(new AnalysisRequestError('Offline', 504, { code: 'network_error' })), /connexion interrompue, vérifiez votre connexion/);
  assert.match(batchPauseMessage(new AnalysisRequestError('Unavailable', 503)), /temporairement indisponible/);
});

test('a resumed mixed lot includes changed locations while keeping current results', () => {
  const retainedResult = { constat: 'Résultat conservé.' };
  const items = [
    { status: 'completed', result: retainedResult, localisation: 'partie commune' as const, analyzedLocalisation: 'partie commune' as const },
    { status: 'completed', result: retainedResult, localisation: 'partie privative' as const, analyzedLocalisation: 'partie commune' as const },
    { status: 'error', localisation: 'partie privative' as const },
    { status: 'pending', localisation: 'partie commune' as const },
    { status: 'completed', result: retainedResult },
  ];
  assert.deepEqual(selectRemainingIndices(items), [1, 2, 3]);
  assert.equal(items[1].result, retainedResult);
  assert.equal(items[2].localisation, 'partie privative');
  assert.equal(isResultOutdated(items[4]), false);
});

test('restoring the location used by a completed diagnostic removes the need for another call', () => {
  const item = { status: 'error', result: {}, localisation: 'partie privative' as const, analyzedLocalisation: 'partie commune' as const };
  assert.equal(isResultOutdated(item), true);
  assert.equal(canRestoreCompletedResult(item, 'partie commune'), true);
  const restored = { ...item, localisation: 'partie commune' as const, status: 'completed' };
  assert.equal(isResultOutdated(restored), false);
  assert.deepEqual(selectRemainingIndices([restored]), []);
  assert.equal(restored.result, item.result);
});

test('a failed refresh stays retryable while its selected location differs from the retained result', () => {
  const item = { status: 'error', result: {}, localisation: 'partie privative' as const, analyzedLocalisation: 'partie commune' as const };
  assert.equal(canRestoreCompletedResult(item, 'partie privative'), false);
  assert.deepEqual(selectRemainingIndices([item]), [0]);
});

test('resuming a lot excludes only completed photos', () => {
  const items = [
    { status: 'completed' },
    { status: 'error' },
    { status: 'pending' },
    { status: 'analyzing' },
    { status: 'completed' },
  ];
  assert.deepEqual(selectRemainingIndices(items), [1, 2, 3]);
  assert.equal(items[0].status, 'completed');
});
