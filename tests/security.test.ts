import assert from 'node:assert/strict';
import test from 'node:test';
import analyzeRoute from '../api/analyze';
import meRoute from '../api/me';
import { getMemberKey } from '../api/_lib/auth.js';
import { analyzePhoto } from '../api/_lib/analyze.js';
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
