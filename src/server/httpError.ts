export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export function publicError(error: unknown): { status: number; error: string } {
  if (error instanceof HttpError) {
    return { status: error.status, error: error.message };
  }

  console.error('Erreur serveur inattendue', error instanceof Error ? error.name : 'inconnue');
  return { status: 500, error: 'Erreur interne. Veuillez réessayer plus tard.' };
}
