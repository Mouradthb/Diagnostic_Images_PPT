import { analyzePhoto } from './_lib/analyze.js';
import { requireAuthorizedMember } from './_lib/auth.js';
import { HttpError, publicError } from './_lib/httpError.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: 'Méthode non autorisée.' }, { status: 405, headers: { Allow: 'POST' } });
    }

    try {
      const member = await requireAuthorizedMember(request.headers.get('authorization'));
      const body = await request.json().catch(() => {
        throw new HttpError(400, 'Corps de requête JSON invalide.');
      });
      const result = await analyzePhoto(body, member.apiKey);
      return Response.json(result);
    } catch (error) {
      const response = publicError(error);
      return Response.json({ error: response.error }, { status: response.status });
    }
  },
};
