import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AnalysisRequestError,
  selectRemainingIndices,
  shouldPauseBatch,
  withTransientRetry,
} from '../src/utils/analysisRetry.ts';

test('a transient 503 is retried once and succeeds after a delay', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const result = await withTransientRetry(async () => {
    attempts++;
    if (attempts < 2) throw new AnalysisRequestError('Gemini unavailable', 503);
    return 'diagnostic';
  }, async (ms) => { delays.push(ms); });

  assert.equal(result, 'diagnostic');
  assert.equal(attempts, 2);
  assert.equal(delays.length, 1);
  assert.ok(delays[0] >= 5_000 && delays[0] < 5_500);
});

test('a persistent 503 stops after one retry and preserves the original error', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const failure = new AnalysisRequestError('Gemini unavailable', 503);

  await assert.rejects(
    withTransientRetry(async () => {
      attempts++;
      throw failure;
    }, async (ms) => { delays.push(ms); }),
    (error: unknown) => error === failure
  );
  assert.equal(attempts, 2);
  assert.equal(delays.length, 1);
});

test('429 and other non-503 errors are not retried', async () => {
  for (const status of [400, 401, 403, 429, 502]) {
    let attempts = 0;
    let waited = false;
    await assert.rejects(
      withTransientRetry(async () => {
        attempts++;
        throw new AnalysisRequestError('Request failed', status);
      }, async () => { waited = true; }),
      (error: unknown) => error instanceof AnalysisRequestError && error.status === status
    );
    assert.equal(attempts, 1);
    assert.equal(waited, false);
  }
});

test('batch pauses for authentication, quota and persistent unavailability', () => {
  for (const status of [401, 403, 429, 503]) {
    assert.equal(shouldPauseBatch(new AnalysisRequestError('Pause', status)), true);
  }
  for (const status of [400, 413, 502]) {
    assert.equal(shouldPauseBatch(new AnalysisRequestError('Continue', status)), false);
  }
  assert.equal(shouldPauseBatch(new Error('Network error')), false);
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
