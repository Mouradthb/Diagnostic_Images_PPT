import { HttpError } from './httpError.js';

type JsonObject = Record<string, unknown>;

function record(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : undefined;
}

function errorObjects(error: unknown): JsonObject[] {
  const outer = record(error);
  if (!outer) return [];
  const objects = [outer];
  const wrapped = record(outer.error);
  if (wrapped) objects.push(wrapped);
  // The SDK stores the Google JSON error body inside ApiError.message.
  // Parse it only for classification; never expose or log its contents.
  if (typeof outer.message === 'string' && outer.message.length <= 65_536) {
    try {
      const parsed = record(JSON.parse(outer.message));
      if (parsed) {
        objects.push(parsed);
        const inner = record(parsed.error);
        if (inner) objects.push(inner);
      }
    } catch {
      // Unstructured provider messages do not establish a quota window.
    }
  }
  return objects;
}

export function getProviderStatus(error: unknown): number {
  for (const object of errorObjects(error)) {
    for (const property of ['status', 'code']) {
      const value = Number(object[property]);
      if (Number.isInteger(value) && value >= 400 && value <= 599) return value;
    }
  }
  return 0;
}

function boundedSeconds(value: number): number | undefined {
  return Number.isFinite(value) && value > 0 && value <= 86_400 ? Math.ceil(value) : undefined;
}

function retryDuration(value: unknown): number | undefined {
  if (typeof value === 'string' && /^\d+(?:\.\d+)?s$/.test(value)) {
    return boundedSeconds(Number(value.slice(0, -1)));
  }
  const duration = record(value);
  if (!duration) return undefined;
  const seconds = Number(duration.seconds ?? 0);
  const nanos = Number(duration.nanos ?? 0);
  if (!Number.isInteger(seconds) || !Number.isInteger(nanos) || nanos < 0 || nanos >= 1_000_000_000) return undefined;
  return boundedSeconds(seconds + nanos / 1_000_000_000);
}

function retryHeaderSeconds(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return boundedSeconds(Number(trimmed));
  const timestamp = Date.parse(trimmed);
  return Number.isFinite(timestamp) ? boundedSeconds((timestamp - Date.now()) / 1000) : undefined;
}

export function providerError(error: unknown, retryAfterHeader?: string | null): HttpError {
  const status = getProviderStatus(error);
  const details = errorObjects(error).flatMap((object) => Array.isArray(object.details) ? object.details : []);
  const retrySeconds = details.flatMap((detail) => {
    const value = record(detail);
    return typeof value?.['@type'] === 'string' && value['@type'].endsWith('/google.rpc.RetryInfo')
      ? [retryDuration(value.retryDelay ?? value.retry_delay)]
      : [];
  }).filter((value): value is number => value !== undefined);
  const headerSeconds = retryHeaderSeconds(retryAfterHeader);
  if (headerSeconds !== undefined) retrySeconds.push(headerSeconds);

  if (status === 429) {
    const violations = details.flatMap((detail) => {
      const value = record(detail);
      return typeof value?.['@type'] === 'string' && value['@type'].endsWith('/google.rpc.QuotaFailure')
        && Array.isArray(value.violations) ? value.violations : [];
    });
    const windows = violations.map((violation) => {
      const value = record(violation);
      const identifiers = [value?.quotaId, value?.quota_id, value?.quotaMetric, value?.quota_metric]
        .filter((item): item is string => typeof item === 'string')
        .join(' ').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (/perday|daily/.test(identifiers)) return 'daily';
      if (/perminute|persecond/.test(identifiers)) return 'rate';
      return 'unknown';
    });
    if (windows.includes('daily')) {
      return new HttpError(429, 'Quota quotidien Gemini épuisé pour ce projet Google. Les résultats sont conservés ; reprenez après son renouvellement.', {
        code: 'quota_daily', canRetry: false,
      });
    }
    if (windows.length > 0 && windows.every((window) => window === 'rate')) {
      return new HttpError(429, 'Limite de débit Gemini atteinte. Une pause est nécessaire avant la reprise.', {
        code: 'rate_limit', canRetry: true, retryAfterSeconds: retrySeconds.length ? Math.max(...retrySeconds) : 60,
      });
    }
    return new HttpError(429, 'Limite Gemini atteinte, sans précision sur son renouvellement. Les résultats sont conservés ; vérifiez le quota du projet dans Google AI Studio.', {
      code: 'quota_unknown', canRetry: false,
    });
  }
  if (status === 503 || status === 504) {
    return new HttpError(503, 'Gemini est temporairement indisponible. Une pause est nécessaire avant une nouvelle tentative.', {
      code: 'provider_unavailable', canRetry: true, retryAfterSeconds: Math.max(...retrySeconds, 30),
    });
  }
  if (status === 401 || status === 403) {
    return new HttpError(403, "La clé Gemini de ce membre est invalide ou n'a pas accès au modèle.");
  }
  if (status === 404) {
    return new HttpError(502, "Le modèle Gemini configuré n'est pas disponible pour cette clé. Contactez l'administrateur.");
  }
  return new HttpError(502, "L'analyse Gemini a échoué. Réessayez cette photo.");
}
