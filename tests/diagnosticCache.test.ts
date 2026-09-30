import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import {
  createDiagnosticCache,
  DIAGNOSTIC_CACHE_MAX_ENTRIES,
  DIAGNOSTIC_CACHE_STORAGE_KEY,
  DIAGNOSTIC_CACHE_TTL_MS,
  DIAGNOSTIC_CACHE_VERSION,
  makeDiagnosticCacheKey,
  type DiagnosticCacheStorage,
} from '../src/utils/diagnosticCache.ts';
import type { DiagnosticResult } from '../src/types.ts';

const diagnostic: DiagnosticResult = {
  statut_analyse: 'constat photographique indicatif',
  priorite: 'Entretien',
  famille: 'Ventilation',
  localisation: 'Logement — bouche d’extraction',
  perimetre: 'partie privative',
  etat_observations: 'Bouche d’extraction encrassée.',
  intervention: 'Nettoyer la bouche et vérifier le débit sur site.',
  cout_estime_min_ttc_eur: 0,
  cout_estime_max_ttc_eur: 0,
  confiance: 'moyen',
};

function memoryStorage(): DiagnosticCacheStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

function key(index = 0, localisation = 'partie commune'): string {
  return `${DIAGNOSTIC_CACHE_VERSION}:${localisation}:${index.toString(16).padStart(64, '0')}`;
}

test('cache identity uses exact file contents and location, rather than the filename or size', async (context) => {
  const previousCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  context.after(() => {
    if (previousCrypto) Object.defineProperty(globalThis, 'crypto', previousCrypto);
    else Reflect.deleteProperty(globalThis, 'crypto');
  });
  const original = new File(['photo A'], 'original.jpg');
  const renamed = new File(['photo A'], 'renamed.jpg');
  const different = new File(['photo B'], 'original.jpg');
  const originalKey = await makeDiagnosticCacheKey(original, 'partie commune');
  assert.ok(originalKey);
  assert.equal(await makeDiagnosticCacheKey(renamed, 'partie commune'), originalKey);
  assert.notEqual(await makeDiagnosticCacheKey(different, 'partie commune'), originalKey);
  assert.notEqual(await makeDiagnosticCacheKey(original, 'partie privative'), originalKey);
  assert.notEqual(await makeDiagnosticCacheKey(original, 'non renseignée'), originalKey);
  const unreadable = { arrayBuffer: async () => { throw new Error('Unreadable'); } } as unknown as Blob;
  assert.equal(await makeDiagnosticCacheKey(unreadable, 'partie commune'), null);
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
  assert.equal(await makeDiagnosticCacheKey(original, 'partie commune'), null);
});

test('a reloaded cache reuses diagnostics only for the same authenticated owner and context', () => {
  const storage = memoryStorage();
  const firstPage = createDiagnosticCache(storage, () => 1000);
  firstPage.cacheDiagnostic('owner-a', key(), diagnostic);
  const reloadedPage = createDiagnosticCache(storage, () => 2000);
  assert.deepEqual(reloadedPage.getCachedDiagnostic('owner-a', key()), diagnostic);
  assert.equal(reloadedPage.getCachedDiagnostic('owner-b', key()), null);
  assert.equal(reloadedPage.getCachedDiagnostic('owner-a', key(0, 'partie privative')), null);
  assert.equal(reloadedPage.getCachedDiagnostic('', key()), null);
});

test('entries expire after 24 hours and reading does not extend their lifetime', () => {
  const storage = memoryStorage();
  let time = 1000;
  const cache = createDiagnosticCache(storage, () => time);
  cache.cacheDiagnostic('owner-a', key(), diagnostic);
  time += DIAGNOSTIC_CACHE_TTL_MS - 1;
  assert.ok(cache.getCachedDiagnostic('owner-a', key()));
  time += 1;
  assert.equal(cache.getCachedDiagnostic('owner-a', key()), null);
});

test('old prompt or contract versions are never restored', () => {
  const storage = memoryStorage();
  const cache = createDiagnosticCache(storage, () => 1000);
  cache.cacheDiagnostic('owner-a', key(), diagnostic);
  const stored = JSON.parse(storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY)!);
  stored.version = 'previous-prompt-version';
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(cache.getCachedDiagnostic('owner-a', key()), null);
  cache.cacheDiagnostic('owner-a', 'previous-version:partie commune:' + '0'.repeat(64), diagnostic);
  assert.equal(cache.getCachedDiagnostic('owner-a', key()), null);
});

test('cache is bounded across accounts, evicts the oldest result and updates duplicate keys', () => {
  const storage = memoryStorage();
  let time = 1000;
  const cache = createDiagnosticCache(storage, () => time++);
  for (let index = 0; index <= DIAGNOSTIC_CACHE_MAX_ENTRIES; index++) {
    cache.cacheDiagnostic(index % 2 ? 'owner-b' : 'owner-a', key(index), diagnostic);
  }
  const stored = JSON.parse(storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY)!);
  assert.equal(stored.entries.length, DIAGNOSTIC_CACHE_MAX_ENTRIES);
  assert.equal(cache.getCachedDiagnostic('owner-a', key(0)), null);
  assert.ok(cache.getCachedDiagnostic('owner-a', key(DIAGNOSTIC_CACHE_MAX_ENTRIES)));
  const updated = { ...diagnostic, etat_observations: 'Constat actualisé.' };
  cache.cacheDiagnostic('owner-a', key(DIAGNOSTIC_CACHE_MAX_ENTRIES), updated);
  assert.equal(JSON.parse(storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY)!).entries.length, DIAGNOSTIC_CACHE_MAX_ENTRIES);
  assert.equal(cache.getCachedDiagnostic('owner-a', key(DIAGNOSTIC_CACHE_MAX_ENTRIES))?.etat_observations, updated.etat_observations);
});

test('clearing one account leaves the other account diagnostics available', () => {
  const storage = memoryStorage();
  const cache = createDiagnosticCache(storage, () => 1000);
  cache.cacheDiagnostic('owner-a', key(), diagnostic);
  cache.cacheDiagnostic('owner-b', key(), diagnostic);
  cache.clearDiagnosticCache('owner-a');
  assert.equal(cache.getCachedDiagnostic('owner-a', key()), null);
  assert.deepEqual(cache.getCachedDiagnostic('owner-b', key()), diagnostic);
  cache.clearDiagnosticCache('owner-b');
  assert.equal(storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY), null);
});

test('malformed or incoherent stored diagnostics are ignored', () => {
  const storage = memoryStorage();
  const cache = createDiagnosticCache(storage, () => 1000);
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, '{broken JSON');
  assert.equal(cache.getCachedDiagnostic('owner-a', key()), null);
  cache.cacheDiagnostic('owner-a', key(), diagnostic);
  const stored = JSON.parse(storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY)!);
  stored.entries[0].result = { ...diagnostic, statut_analyse: 'image non exploitable' };
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(cache.getCachedDiagnostic('owner-a', key()), null);
  stored.entries[0].result = { ...diagnostic, confiance: 'inventée' };
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(cache.getCachedDiagnostic('owner-a', key()), null);
  stored.entries[0].result = { ...diagnostic, intervention: '' };
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(cache.getCachedDiagnostic('owner-a', key()), null);
  stored.entries[0].result = { ...diagnostic, cout_estime_min_ttc_eur: -100 };
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(cache.getCachedDiagnostic('owner-a', key()), null);
  stored.entries[0].result = diagnostic;
  stored.entries[0].expiresAt += DIAGNOSTIC_CACHE_TTL_MS;
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(cache.getCachedDiagnostic('owner-a', key()), null);
});

test('only approved diagnostic fields are persisted and restored values cannot mutate the cache', () => {
  const storage = memoryStorage();
  const cache = createDiagnosticCache(storage, () => 1000);
  const extraFields = { ...diagnostic, imageBase64: 'secret-photo-bytes', apiKey: 'secret-api-key', file: { name: 'secret.jpg' }, remarque_technique: 'unused-legacy-field' };
  cache.cacheDiagnostic('owner-a', key(), extraFields);
  const raw = storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY)!;
  assert.equal(raw.includes('secret-'), false);
  assert.equal(raw.includes('secret.jpg'), false);
  assert.equal(raw.includes('unused-legacy-field'), false);
  const restored = cache.getCachedDiagnostic('owner-a', key())!;
  restored.famille = 'Changed by caller';
  restored.etat_observations = 'Changed by caller';
  assert.deepEqual(cache.getCachedDiagnostic('owner-a', key()), diagnostic);
});

test('unavailable or full browser storage disables caching without failing an analysis', () => {
  const unavailable = createDiagnosticCache(null);
  assert.equal(unavailable.getCachedDiagnostic('owner-a', key()), null);
  assert.doesNotThrow(() => unavailable.cacheDiagnostic('owner-a', key(), diagnostic));
  const throwing = createDiagnosticCache({
    getItem: () => { throw new Error('SecurityError'); },
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: () => { throw new Error('SecurityError'); },
  });
  assert.equal(throwing.getCachedDiagnostic('owner-a', key()), null);
  assert.doesNotThrow(() => throwing.cacheDiagnostic('owner-a', key(), diagnostic));
  assert.doesNotThrow(() => throwing.clearDiagnosticCache('owner-a'));
});
