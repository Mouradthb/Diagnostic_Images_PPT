import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AnalysisRequestError,
  selectRemainingIndices,
  shouldPauseBatch,
} from '../src/utils/analysisRetry.ts';

test('batch pauses for authentication, quota and provider unavailability', () => {
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
