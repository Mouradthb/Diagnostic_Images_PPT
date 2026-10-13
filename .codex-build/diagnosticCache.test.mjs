// tests/diagnosticCache.test.ts
import assert from "node:assert/strict";
import { File } from "node:buffer";
import { webcrypto } from "node:crypto";
import test from "node:test";

// api/_lib/diagnosticContract.ts
var DIAGNOSTIC_NIVEAUX = [
  "Entretien",
  "Signalement hors PPPT \xE0 v\xE9rifier",
  "Curatif Niveau 1",
  "Curatif Niveau 2",
  "Curatif Niveau 3",
  "Travaux \xE9nerg\xE9tiques",
  "\xC0 confirmer / expertise n\xE9cessaire"
];
var STATUTS_ANALYSE = [
  "constat photographique indicatif",
  "image non exploitable",
  "expertise n\xE9cessaire"
];
var PERIMETRES_APPARENTS = [
  "partie commune",
  "partie privative",
  "partie commune \xE0 jouissance privative",
  "ind\xE9termin\xE9"
];
var NIVEAUX_CONFIANCE = ["faible", "moyen", "\xE9lev\xE9"];
var LOCALISATIONS_PHOTO = ["non renseign\xE9e", "partie commune", "partie privative"];

// src/utils/diagnosticCache.ts
var DIAGNOSTIC_CACHE_VERSION = typeof __DIAGNOSTIC_CACHE_VERSION__ === "undefined" ? "free-cache-v1" : __DIAGNOSTIC_CACHE_VERSION__;
var DIAGNOSTIC_CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
var DIAGNOSTIC_CACHE_MAX_ENTRIES = 200;
var DIAGNOSTIC_CACHE_STORAGE_KEY = "franceverte.diagnostic-cache";
function isOneOf(value, choices) {
  return typeof value === "string" && choices.includes(value);
}
function isText(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 8e3;
}
function isEstimatedCost(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1e7;
}
function restoreDiagnostic(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value;
  if (!isOneOf(result.statut_analyse, STATUTS_ANALYSE) || !isOneOf(result.priorite, DIAGNOSTIC_NIVEAUX) || !isText(result.famille) || !isText(result.localisation) || !isOneOf(result.perimetre, PERIMETRES_APPARENTS) || !isText(result.etat_observations) || !isText(result.intervention) || !isEstimatedCost(result.cout_estime_min_ttc_eur) || !isEstimatedCost(result.cout_estime_max_ttc_eur) || result.cout_estime_min_ttc_eur > result.cout_estime_max_ttc_eur || result.cout_estime_min_ttc_eur === 0 !== (result.cout_estime_max_ttc_eur === 0) || !isOneOf(result.confiance, NIVEAUX_CONFIANCE)) return null;
  if (result.statut_analyse === "image non exploitable" && (result.priorite !== "\xC0 confirmer / expertise n\xE9cessaire" || result.confiance !== "faible")) return null;
  if (result.statut_analyse === "expertise n\xE9cessaire" && result.priorite !== "\xC0 confirmer / expertise n\xE9cessaire") return null;
  if ((result.priorite === "Entretien" || result.priorite === "Signalement hors PPPT \xE0 v\xE9rifier" || result.priorite === "\xC0 confirmer / expertise n\xE9cessaire") && (result.cout_estime_min_ttc_eur !== 0 || result.cout_estime_max_ttc_eur !== 0)) return null;
  return {
    statut_analyse: result.statut_analyse,
    priorite: result.priorite,
    famille: result.famille,
    localisation: result.localisation,
    perimetre: result.perimetre,
    etat_observations: result.etat_observations,
    intervention: result.intervention,
    cout_estime_min_ttc_eur: result.cout_estime_min_ttc_eur,
    cout_estime_max_ttc_eur: result.cout_estime_max_ttc_eur,
    confiance: result.confiance
  };
}
function isOwnerUid(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 128 && value.trim() === value;
}
function isCacheKey(value) {
  if (typeof value !== "string") return false;
  return LOCALISATIONS_PHOTO.some((localisation) => {
    const prefix = `${DIAGNOSTIC_CACHE_VERSION}:${localisation}:`;
    return value.startsWith(prefix) && /^[a-f0-9]{64}$/.test(value.slice(prefix.length));
  });
}
async function makeDiagnosticCacheKey(file, localisation) {
  try {
    if (!isOneOf(localisation, LOCALISATIONS_PHOTO) || !globalThis.crypto?.subtle) return null;
    const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${DIAGNOSTIC_CACHE_VERSION}:${localisation}:${fingerprint}`;
  } catch {
    return null;
  }
}
function createDiagnosticCache(storage, now = Date.now) {
  function readEntries() {
    if (!storage) return [];
    try {
      const raw = storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY);
      if (!raw || raw.length > 4e6) return [];
      const envelope = JSON.parse(raw);
      if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) return [];
      const candidate = envelope;
      if (candidate.version !== DIAGNOSTIC_CACHE_VERSION || !Array.isArray(candidate.entries) || candidate.entries.length > DIAGNOSTIC_CACHE_MAX_ENTRIES) return [];
      const currentTime = now();
      const entries = [];
      for (const value of candidate.entries) {
        if (!value || typeof value !== "object" || Array.isArray(value)) continue;
        const entry = value;
        if (!isOwnerUid(entry.ownerUid) || !isCacheKey(entry.key) || typeof entry.savedAt !== "number" || !Number.isFinite(entry.savedAt) || typeof entry.expiresAt !== "number" || !Number.isFinite(entry.expiresAt) || entry.savedAt > currentTime || entry.expiresAt <= currentTime || entry.expiresAt !== entry.savedAt + DIAGNOSTIC_CACHE_TTL_MS) continue;
        const result = restoreDiagnostic(entry.result);
        if (result) entries.push({ ownerUid: entry.ownerUid, key: entry.key, savedAt: entry.savedAt, expiresAt: entry.expiresAt, result });
      }
      return entries;
    } catch {
      return [];
    }
  }
  function writeEntries(entries) {
    if (!storage) return;
    try {
      if (entries.length === 0) {
        storage.removeItem(DIAGNOSTIC_CACHE_STORAGE_KEY);
        return;
      }
      const envelope = { version: DIAGNOSTIC_CACHE_VERSION, entries };
      storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(envelope));
    } catch {
    }
  }
  return {
    getCachedDiagnostic(ownerUid, key2) {
      if (!isOwnerUid(ownerUid) || !isCacheKey(key2)) return null;
      return readEntries().find((entry) => entry.ownerUid === ownerUid && entry.key === key2)?.result ?? null;
    },
    cacheDiagnostic(ownerUid, key2, result) {
      if (!isOwnerUid(ownerUid) || !isCacheKey(key2)) return;
      const restored = restoreDiagnostic(result);
      if (!restored) return;
      const savedAt = now();
      const entries = readEntries().filter((entry) => entry.ownerUid !== ownerUid || entry.key !== key2);
      entries.push({ ownerUid, key: key2, savedAt, expiresAt: savedAt + DIAGNOSTIC_CACHE_TTL_MS, result: restored });
      entries.sort((a, b) => a.savedAt - b.savedAt);
      writeEntries(entries.slice(-DIAGNOSTIC_CACHE_MAX_ENTRIES));
    },
    clearDiagnosticCache(ownerUid) {
      if (!isOwnerUid(ownerUid)) return;
      writeEntries(readEntries().filter((entry) => entry.ownerUid !== ownerUid));
    }
  };
}

// tests/diagnosticCache.test.ts
var diagnostic = {
  statut_analyse: "constat photographique indicatif",
  priorite: "Entretien",
  famille: "Ventilation",
  localisation: "Logement \u2014 bouche d\u2019extraction",
  perimetre: "partie privative",
  etat_observations: "Bouche d\u2019extraction encrass\xE9e.",
  intervention: "Nettoyer la bouche et v\xE9rifier le d\xE9bit sur site.",
  cout_estime_min_ttc_eur: 0,
  cout_estime_max_ttc_eur: 0,
  confiance: "moyen"
};
function memoryStorage() {
  const values = /* @__PURE__ */ new Map();
  return {
    getItem: (key2) => values.get(key2) ?? null,
    setItem: (key2, value) => {
      values.set(key2, value);
    },
    removeItem: (key2) => {
      values.delete(key2);
    }
  };
}
function key(index = 0, localisation = "partie commune") {
  return `${DIAGNOSTIC_CACHE_VERSION}:${localisation}:${index.toString(16).padStart(64, "0")}`;
}
test("cache identity uses exact file contents and location, rather than the filename or size", async (context) => {
  const previousCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
  context.after(() => {
    if (previousCrypto) Object.defineProperty(globalThis, "crypto", previousCrypto);
    else Reflect.deleteProperty(globalThis, "crypto");
  });
  const original = new File(["photo A"], "original.jpg");
  const renamed = new File(["photo A"], "renamed.jpg");
  const different = new File(["photo B"], "original.jpg");
  const originalKey = await makeDiagnosticCacheKey(original, "partie commune");
  assert.ok(originalKey);
  assert.equal(await makeDiagnosticCacheKey(renamed, "partie commune"), originalKey);
  assert.notEqual(await makeDiagnosticCacheKey(different, "partie commune"), originalKey);
  assert.notEqual(await makeDiagnosticCacheKey(original, "partie privative"), originalKey);
  assert.notEqual(await makeDiagnosticCacheKey(original, "non renseign\xE9e"), originalKey);
  const unreadable = { arrayBuffer: async () => {
    throw new Error("Unreadable");
  } };
  assert.equal(await makeDiagnosticCacheKey(unreadable, "partie commune"), null);
  Object.defineProperty(globalThis, "crypto", { value: void 0, configurable: true });
  assert.equal(await makeDiagnosticCacheKey(original, "partie commune"), null);
});
test("a reloaded cache reuses diagnostics only for the same authenticated owner and context", () => {
  const storage = memoryStorage();
  const firstPage = createDiagnosticCache(storage, () => 1e3);
  firstPage.cacheDiagnostic("owner-a", key(), diagnostic);
  const reloadedPage = createDiagnosticCache(storage, () => 2e3);
  assert.deepEqual(reloadedPage.getCachedDiagnostic("owner-a", key()), diagnostic);
  assert.equal(reloadedPage.getCachedDiagnostic("owner-b", key()), null);
  assert.equal(reloadedPage.getCachedDiagnostic("owner-a", key(0, "partie privative")), null);
  assert.equal(reloadedPage.getCachedDiagnostic("", key()), null);
});
test("entries expire after 24 hours and reading does not extend their lifetime", () => {
  const storage = memoryStorage();
  let time = 1e3;
  const cache = createDiagnosticCache(storage, () => time);
  cache.cacheDiagnostic("owner-a", key(), diagnostic);
  time += DIAGNOSTIC_CACHE_TTL_MS - 1;
  assert.ok(cache.getCachedDiagnostic("owner-a", key()));
  time += 1;
  assert.equal(cache.getCachedDiagnostic("owner-a", key()), null);
});
test("old prompt or contract versions are never restored", () => {
  const storage = memoryStorage();
  const cache = createDiagnosticCache(storage, () => 1e3);
  cache.cacheDiagnostic("owner-a", key(), diagnostic);
  const stored = JSON.parse(storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY));
  stored.version = "previous-prompt-version";
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(cache.getCachedDiagnostic("owner-a", key()), null);
  cache.cacheDiagnostic("owner-a", "previous-version:partie commune:" + "0".repeat(64), diagnostic);
  assert.equal(cache.getCachedDiagnostic("owner-a", key()), null);
});
test("cache is bounded across accounts, evicts the oldest result and updates duplicate keys", () => {
  const storage = memoryStorage();
  let time = 1e3;
  const cache = createDiagnosticCache(storage, () => time++);
  for (let index = 0; index <= DIAGNOSTIC_CACHE_MAX_ENTRIES; index++) {
    cache.cacheDiagnostic(index % 2 ? "owner-b" : "owner-a", key(index), diagnostic);
  }
  const stored = JSON.parse(storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY));
  assert.equal(stored.entries.length, DIAGNOSTIC_CACHE_MAX_ENTRIES);
  assert.equal(cache.getCachedDiagnostic("owner-a", key(0)), null);
  assert.ok(cache.getCachedDiagnostic("owner-a", key(DIAGNOSTIC_CACHE_MAX_ENTRIES)));
  const updated = { ...diagnostic, etat_observations: "Constat actualis\xE9." };
  cache.cacheDiagnostic("owner-a", key(DIAGNOSTIC_CACHE_MAX_ENTRIES), updated);
  assert.equal(JSON.parse(storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY)).entries.length, DIAGNOSTIC_CACHE_MAX_ENTRIES);
  assert.equal(cache.getCachedDiagnostic("owner-a", key(DIAGNOSTIC_CACHE_MAX_ENTRIES))?.etat_observations, updated.etat_observations);
});
test("clearing one account leaves the other account diagnostics available", () => {
  const storage = memoryStorage();
  const cache = createDiagnosticCache(storage, () => 1e3);
  cache.cacheDiagnostic("owner-a", key(), diagnostic);
  cache.cacheDiagnostic("owner-b", key(), diagnostic);
  cache.clearDiagnosticCache("owner-a");
  assert.equal(cache.getCachedDiagnostic("owner-a", key()), null);
  assert.deepEqual(cache.getCachedDiagnostic("owner-b", key()), diagnostic);
  cache.clearDiagnosticCache("owner-b");
  assert.equal(storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY), null);
});
test("malformed or incoherent stored diagnostics are ignored", () => {
  const storage = memoryStorage();
  const cache = createDiagnosticCache(storage, () => 1e3);
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, "{broken JSON");
  assert.equal(cache.getCachedDiagnostic("owner-a", key()), null);
  cache.cacheDiagnostic("owner-a", key(), diagnostic);
  const stored = JSON.parse(storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY));
  stored.entries[0].result = { ...diagnostic, statut_analyse: "image non exploitable" };
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(cache.getCachedDiagnostic("owner-a", key()), null);
  stored.entries[0].result = { ...diagnostic, confiance: "invent\xE9e" };
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(cache.getCachedDiagnostic("owner-a", key()), null);
  stored.entries[0].result = { ...diagnostic, intervention: "" };
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(cache.getCachedDiagnostic("owner-a", key()), null);
  stored.entries[0].result = { ...diagnostic, cout_estime_min_ttc_eur: -100 };
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(cache.getCachedDiagnostic("owner-a", key()), null);
  stored.entries[0].result = diagnostic;
  stored.entries[0].expiresAt += DIAGNOSTIC_CACHE_TTL_MS;
  storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(stored));
  assert.equal(cache.getCachedDiagnostic("owner-a", key()), null);
});
test("only approved diagnostic fields are persisted and restored values cannot mutate the cache", () => {
  const storage = memoryStorage();
  const cache = createDiagnosticCache(storage, () => 1e3);
  const extraFields = { ...diagnostic, imageBase64: "secret-photo-bytes", apiKey: "secret-api-key", file: { name: "secret.jpg" }, remarque_technique: "unused-legacy-field" };
  cache.cacheDiagnostic("owner-a", key(), extraFields);
  const raw = storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY);
  assert.equal(raw.includes("secret-"), false);
  assert.equal(raw.includes("secret.jpg"), false);
  assert.equal(raw.includes("unused-legacy-field"), false);
  const restored = cache.getCachedDiagnostic("owner-a", key());
  restored.famille = "Changed by caller";
  restored.etat_observations = "Changed by caller";
  assert.deepEqual(cache.getCachedDiagnostic("owner-a", key()), diagnostic);
});
test("unavailable or full browser storage disables caching without failing an analysis", () => {
  const unavailable = createDiagnosticCache(null);
  assert.equal(unavailable.getCachedDiagnostic("owner-a", key()), null);
  assert.doesNotThrow(() => unavailable.cacheDiagnostic("owner-a", key(), diagnostic));
  const throwing = createDiagnosticCache({
    getItem: () => {
      throw new Error("SecurityError");
    },
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {
      throw new Error("SecurityError");
    }
  });
  assert.equal(throwing.getCachedDiagnostic("owner-a", key()), null);
  assert.doesNotThrow(() => throwing.cacheDiagnostic("owner-a", key(), diagnostic));
  assert.doesNotThrow(() => throwing.clearDiagnosticCache("owner-a"));
});
