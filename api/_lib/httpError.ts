export const PUBLIC_ERROR_CODES = [
  'quota_daily', 'rate_limit', 'quota_unknown', 'provider_unavailable', 'request_aborted',
] as const;

export type PublicErrorCode = typeof PUBLIC_ERROR_CODES[number];
export interface ErrorMetadata {
  code: PublicErrorCode;
  canRetry: boolean;
  retryAfterSeconds?: number;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly metadata?: ErrorMetadata
  ) {
    super(message);
  }
}

export interface PublicErrorResponse {
  status: number;
  error: string;
  code?: PublicErrorCode;
  canRetry?: boolean;
  retryAfterSeconds?: number;
}

export function publicError(error: unknown): PublicErrorResponse {
  if (error instanceof HttpError) {
    const response: PublicErrorResponse = { status: error.status, error: error.message };
    const metadata = error.metadata;
    if (metadata && PUBLIC_ERROR_CODES.includes(metadata.code)) {
      response.code = metadata.code;
      const temporary = metadata.code === 'rate_limit' || metadata.code === 'provider_unavailable';
      response.canRetry = temporary && metadata.canRetry === true;
      if (response.canRetry && Number.isFinite(metadata.retryAfterSeconds)
        && metadata.retryAfterSeconds! > 0 && metadata.retryAfterSeconds! <= 86_400) {
        response.retryAfterSeconds = Math.ceil(metadata.retryAfterSeconds!);
      }
    }
    return response;
  }

  console.error('Erreur serveur inattendue', error instanceof Error ? error.name : 'inconnue');
  return { status: 500, error: 'Erreur interne. Veuillez réessayer plus tard.' };
}

export function publicErrorHeaders(response: PublicErrorResponse): Record<string, string> {
  return response.canRetry && response.retryAfterSeconds
    ? { 'Retry-After': String(response.retryAfterSeconds) }
    : {};
}
