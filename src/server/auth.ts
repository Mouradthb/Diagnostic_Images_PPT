import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { HttpError } from './httpError';

export interface VerifiedMember {
  uid: string;
  email: string | null;
}

function getFirebaseAdminApp() {
  const existing = getApps().find((app) => app.name === 'diagnostic-auth');
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new HttpError(503, "L'authentification du serveur n'est pas configurée.");
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  }, 'diagnostic-auth');
}

export async function verifyMember(authorization: string | null): Promise<VerifiedMember> {
  const match = /^Bearer ([^\s]+)$/.exec(authorization ?? '');
  if (!match) {
    throw new HttpError(401, 'Connexion requise.');
  }

  let decoded;
  try {
    decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(match[1], true);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'Session expirée ou invalide. Reconnectez-vous.');
  }

  if (decoded.firebase?.sign_in_provider !== 'google.com') {
    throw new HttpError(403, 'Connectez-vous avec un compte Google autorisé.');
  }

  return { uid: decoded.uid, email: decoded.email ?? null };
}

export function getMemberKey(uid: string): string | null {
  const raw = process.env.GEMINI_KEYS_BY_UID;
  if (!raw) {
    throw new HttpError(503, 'Les clés des membres ne sont pas configurées.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(503, 'La configuration des clés des membres est invalide.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(503, 'La configuration des clés des membres est invalide.');
  }

  const key = (parsed as Record<string, unknown>)[uid];
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}

export async function requireAuthorizedMember(authorization: string | null) {
  const member = await verifyMember(authorization);
  const apiKey = getMemberKey(member.uid);
  if (!apiKey) {
    throw new HttpError(403, "Ce compte n'est pas encore autorisé. Contactez l'administrateur.");
  }
  return { ...member, apiKey };
}
