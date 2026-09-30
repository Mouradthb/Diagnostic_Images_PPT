import {
  DIAGNOSTIC_NIVEAUX,
  LOCALISATIONS_PHOTO,
  NIVEAUX_CONFIANCE,
  PERIMETRES_APPARENTS,
  STATUTS_ANALYSE,
} from '../../api/_lib/diagnosticContract.js';
import type { DiagnosticResult, LocalisationPhoto } from '../types';

// Vite injects a hash of the prompt, response contract and selected model IDs.
// The fallback keeps this browser-only module usable outside a Vite build.
declare const __DIAGNOSTIC_CACHE_VERSION__: string;
export const DIAGNOSTIC_CACHE_VERSION = typeof __DIAGNOSTIC_CACHE_VERSION__ === 'undefined'
  ? 'free-cache-v1'
  : __DIAGNOSTIC_CACHE_VERSION__;
export const DIAGNOSTIC_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const DIAGNOSTIC_CACHE_MAX_ENTRIES = 200;
export const DIAGNOSTIC_CACHE_STORAGE_KEY = 'franceverte.diagnostic-cache';

export type DiagnosticCacheStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface CacheEntry {
  ownerUid: string;
  key: string;
  savedAt: number;
  expiresAt: number;
  result: DiagnosticResult;
}

interface CacheEnvelope {
  version: string;
  entries: CacheEntry[];
}

function isOneOf<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === 'string' && choices.includes(value as T);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 8000;
}

function isEstimatedCost(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10_000_000;
}

/** Rebuild only approved fields; storage must never be trusted as an API response. */
function restoreDiagnostic(value: unknown): DiagnosticResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  if (!isOneOf(result.statut_analyse, STATUTS_ANALYSE)
    || !isOneOf(result.priorite, DIAGNOSTIC_NIVEAUX)
    || !isText(result.famille)
    || !isText(result.localisation)
    || !isOneOf(result.perimetre, PERIMETRES_APPARENTS)
    || !isText(result.etat_observations)
    || !isText(result.intervention)
    || !isEstimatedCost(result.cout_estime_min_ttc_eur)
    || !isEstimatedCost(result.cout_estime_max_ttc_eur)
    || result.cout_estime_min_ttc_eur > result.cout_estime_max_ttc_eur
    || (result.cout_estime_min_ttc_eur === 0) !== (result.cout_estime_max_ttc_eur === 0)
    || !isOneOf(result.confiance, NIVEAUX_CONFIANCE)) return null;

  if (result.statut_analyse === 'image non exploitable'
    && (result.priorite !== 'À confirmer / expertise nécessaire' || result.confiance !== 'faible')) return null;
  if (result.statut_analyse === 'expertise nécessaire'
    && result.priorite !== 'À confirmer / expertise nécessaire') return null;
  if ((result.priorite === 'Entretien'
    || result.priorite === 'Signalement hors PPPT à vérifier'
    || result.priorite === 'À confirmer / expertise nécessaire')
    && (result.cout_estime_min_ttc_eur !== 0 || result.cout_estime_max_ttc_eur !== 0)) return null;

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
    confiance: result.confiance,
  };
}

function isOwnerUid(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 && value.trim() === value;
}

function isCacheKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return LOCALISATIONS_PHOTO.some((localisation) => {
    const prefix = `${DIAGNOSTIC_CACHE_VERSION}:${localisation}:`;
    return value.startsWith(prefix) && /^[a-f0-9]{64}$/.test(value.slice(prefix.length));
  });
}

/** A name/size match is insufficient: reuse requires the same photo bytes and context. */
export async function makeDiagnosticCacheKey(
  file: Blob,
  localisation: LocalisationPhoto
): Promise<string | null> {
  try {
    if (!isOneOf(localisation, LOCALISATIONS_PHOTO) || !globalThis.crypto?.subtle) return null;
    const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${DIAGNOSTIC_CACHE_VERSION}:${localisation}:${fingerprint}`;
  } catch {
    // Private browsing, unsupported Web Crypto or unreadable files disable caching only.
    return null;
  }
}

export function createDiagnosticCache(storage: DiagnosticCacheStorage | null, now: () => number = Date.now) {
  function readEntries(): CacheEntry[] {
    if (!storage) return [];
    try {
      const raw = storage.getItem(DIAGNOSTIC_CACHE_STORAGE_KEY);
      if (!raw || raw.length > 4_000_000) return [];
      const envelope: unknown = JSON.parse(raw);
      if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) return [];
      const candidate = envelope as Record<string, unknown>;
      if (candidate.version !== DIAGNOSTIC_CACHE_VERSION || !Array.isArray(candidate.entries)
        || candidate.entries.length > DIAGNOSTIC_CACHE_MAX_ENTRIES) return [];

      const currentTime = now();
      const entries: CacheEntry[] = [];
      for (const value of candidate.entries) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
        const entry = value as Record<string, unknown>;
        if (!isOwnerUid(entry.ownerUid) || !isCacheKey(entry.key)
          || typeof entry.savedAt !== 'number' || !Number.isFinite(entry.savedAt)
          || typeof entry.expiresAt !== 'number' || !Number.isFinite(entry.expiresAt)
          || entry.savedAt > currentTime || entry.expiresAt <= currentTime
          || entry.expiresAt !== entry.savedAt + DIAGNOSTIC_CACHE_TTL_MS) continue;
        const result = restoreDiagnostic(entry.result);
        if (result) entries.push({ ownerUid: entry.ownerUid, key: entry.key, savedAt: entry.savedAt, expiresAt: entry.expiresAt, result });
      }
      return entries;
    } catch {
      return [];
    }
  }

  function writeEntries(entries: CacheEntry[]): void {
    if (!storage) return;
    try {
      if (entries.length === 0) {
        storage.removeItem(DIAGNOSTIC_CACHE_STORAGE_KEY);
        return;
      }
      const envelope: CacheEnvelope = { version: DIAGNOSTIC_CACHE_VERSION, entries };
      storage.setItem(DIAGNOSTIC_CACHE_STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      // Storage availability or quota must never turn a successful analysis into an error.
    }
  }

  return {
    getCachedDiagnostic(ownerUid: string, key: string): DiagnosticResult | null {
      if (!isOwnerUid(ownerUid) || !isCacheKey(key)) return null;
      return readEntries().find((entry) => entry.ownerUid === ownerUid && entry.key === key)?.result ?? null;
    },
    cacheDiagnostic(ownerUid: string, key: string, result: DiagnosticResult): void {
      if (!isOwnerUid(ownerUid) || !isCacheKey(key)) return;
      const restored = restoreDiagnostic(result);
      if (!restored) return;
      const savedAt = now();
      const entries = readEntries().filter((entry) => entry.ownerUid !== ownerUid || entry.key !== key);
      entries.push({ ownerUid, key, savedAt, expiresAt: savedAt + DIAGNOSTIC_CACHE_TTL_MS, result: restored });
      entries.sort((a, b) => a.savedAt - b.savedAt);
      writeEntries(entries.slice(-DIAGNOSTIC_CACHE_MAX_ENTRIES));
    },
    clearDiagnosticCache(ownerUid: string): void {
      if (!isOwnerUid(ownerUid)) return;
      writeEntries(readEntries().filter((entry) => entry.ownerUid !== ownerUid));
    },
  };
}

function browserCache() {
  try {
    return createDiagnosticCache(globalThis.localStorage ?? null);
  } catch {
    return createDiagnosticCache(null);
  }
}

export function getCachedDiagnostic(ownerUid: string, key: string): DiagnosticResult | null {
  return browserCache().getCachedDiagnostic(ownerUid, key);
}

export function cacheDiagnostic(ownerUid: string, key: string, result: DiagnosticResult): void {
  browserCache().cacheDiagnostic(ownerUid, key, result);
}

export function clearDiagnosticCache(ownerUid: string): void {
  browserCache().clearDiagnosticCache(ownerUid);
}
