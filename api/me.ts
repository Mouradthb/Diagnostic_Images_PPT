import { getMemberKey, verifyMember } from './_lib/auth.js';
import { publicError } from './_lib/httpError.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return Response.json({ error: 'Méthode non autorisée.' }, { status: 405, headers: { Allow: 'GET' } });
    }

    try {
      const member = await verifyMember(request.headers.get('authorization'));
      return Response.json({
        uid: member.uid,
        email: member.email,
        authorized: Boolean(getMemberKey(member.uid)),
      });
    } catch (error) {
      const response = publicError(error);
      return Response.json({ error: response.error }, { status: response.status });
    }
  },
};
