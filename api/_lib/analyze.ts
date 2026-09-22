import { GoogleGenAI, Type } from '@google/genai';
import type { DiagnosticResult } from '../../src/types';
import {
  DIAGNOSTIC_NIVEAUX,
  ENJEUX_DIAGNOSTIC,
  NIVEAUX_CONFIANCE,
  PERIMETRES_APPARENTS,
  STATUTS_ANALYSE,
} from './diagnosticContract.js';
import { HttpError } from './httpError.js';
import { SYSTEM_INSTRUCTION } from './prompt.js';

const PRIMARY_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL?.trim() || 'gemini-2.5-flash';
const MAX_IMAGE_BYTES = 3_000_000;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    statut_analyse: { type: Type.STRING, enum: [...STATUTS_ANALYSE] },
    niveau: { type: Type.STRING, enum: [...DIAGNOSTIC_NIVEAUX] },
    domaines_techniques: { type: Type.ARRAY, items: { type: Type.STRING } },
    perimetre_apparent: { type: Type.STRING, enum: [...PERIMETRES_APPARENTS] },
    constat_factuel: { type: Type.STRING },
    hypotheses_causes: { type: Type.ARRAY, items: { type: Type.STRING } },
    enjeux: { type: Type.ARRAY, items: { type: Type.STRING, enum: [...ENJEUX_DIAGNOSTIC] } },
    risques_evolution: { type: Type.STRING },
    action_immediate: { type: Type.STRING },
    verification_preconisee: { type: Type.STRING },
    remediation_proposee: { type: Type.STRING },
    references_a_verifier: { type: Type.ARRAY, items: { type: Type.STRING } },
    niveau_confiance: { type: Type.STRING, enum: [...NIVEAUX_CONFIANCE] },
    limites: { type: Type.STRING },
  },
  required: [
    'statut_analyse', 'niveau', 'domaines_techniques', 'perimetre_apparent',
    'constat_factuel', 'hypotheses_causes', 'enjeux', 'risques_evolution',
    'action_immediate', 'verification_preconisee', 'remediation_proposee',
    'references_a_verifier', 'niveau_confiance', 'limites',
  ],
};

function isExpectedImage(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
}

function validateImage(body: unknown): { data: string; mimeType: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Une photo est requise.');
  }

  const { imageBase64, mimeType } = body as Record<string, unknown>;
  if (typeof imageBase64 !== 'string' || typeof mimeType !== 'string' || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new HttpError(400, 'Photo invalide. Formats acceptés : JPG, PNG et WEBP.');
  }

  const prefix = /^data:([^;]+);base64,/.exec(imageBase64);
  if (imageBase64.startsWith('data:') && (!prefix || prefix[1] !== mimeType)) {
    throw new HttpError(400, 'Le format déclaré ne correspond pas à la photo.');
  }

  const data = prefix ? imageBase64.slice(prefix[0].length) : imageBase64;
  if (!data || data.length > 4_000_000 || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw new HttpError(413, 'Photo trop volumineuse ou illisible.');
  }

  const bytes = Buffer.from(data, 'base64');
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES || !isExpectedImage(bytes, mimeType)) {
    throw new HttpError(400, 'Photo illisible ou trop volumineuse.');
  }

  return { data, mimeType };
}

function isOneOf(value: unknown, choices: readonly string[]): value is string {
  return typeof value === 'string' && choices.includes(value);
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTextArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyText);
}

export function validateResult(value: unknown): DiagnosticResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(502, 'Le diagnostic reçu est invalide. Réessayez cette photo.');
  }

  const result = value as Record<string, unknown>;
  if (!isOneOf(result.statut_analyse, STATUTS_ANALYSE)
    || !isOneOf(result.niveau, DIAGNOSTIC_NIVEAUX)
    || !isTextArray(result.domaines_techniques)
    || !isOneOf(result.perimetre_apparent, PERIMETRES_APPARENTS)
    || !isNonEmptyText(result.constat_factuel)
    || !isTextArray(result.hypotheses_causes)
    || !Array.isArray(result.enjeux)
    || !result.enjeux.every((enjeu) => isOneOf(enjeu, ENJEUX_DIAGNOSTIC))
    || !isNonEmptyText(result.risques_evolution)
    || !isNonEmptyText(result.action_immediate)
    || !isNonEmptyText(result.verification_preconisee)
    || !isNonEmptyText(result.remediation_proposee)
    || !isTextArray(result.references_a_verifier)
    || !isOneOf(result.niveau_confiance, NIVEAUX_CONFIANCE)
    || !isNonEmptyText(result.limites)) {
    throw new HttpError(502, 'Le diagnostic reçu est incomplet. Réessayez cette photo.');
  }

  if (result.statut_analyse === 'image non exploitable'
    && (result.niveau !== 'À confirmer / expertise nécessaire' || result.niveau_confiance !== 'faible')) {
    throw new HttpError(502, 'Le diagnostic reçu est incohérent. Réessayez cette photo.');
  }
  if (result.statut_analyse === 'expertise nécessaire' && result.niveau !== 'À confirmer / expertise nécessaire') {
    throw new HttpError(502, 'Le diagnostic reçu est incohérent. Réessayez cette photo.');
  }

  return result as unknown as DiagnosticResult;
}

function getProviderStatus(error: unknown): number {
  if (typeof error !== 'object' || error === null) return 0;

  for (const property of ['status', 'code'] as const) {
    if (property in error) {
      const value = Number(error[property]);
      if (Number.isFinite(value)) return value;
    }
  }

  return 0;
}

function getProviderCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;

  for (const property of ['code', 'status'] as const) {
    if (property in error && typeof error[property] === 'string') {
      return error[property].slice(0, 80);
    }
  }

  return undefined;
}

function safeProviderMessage(error: unknown, apiKey: string): string | undefined {
  if (!(error instanceof Error) || !error.message) return undefined;

  return error.message
    .replaceAll(apiKey, '[REDACTED]')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 400);
}

function logProviderFailure(model: string, error: unknown, apiKey: string): void {
  console.error('[Gemini] model request failed', {
    model,
    status: getProviderStatus(error) || undefined,
    code: getProviderCode(error),
    message: safeProviderMessage(error, apiKey),
  });
}

export async function withGeminiFallback<T>(
  request: (model: string) => Promise<T>,
  primaryModel: string,
  fallbackModel: string,
  onFailure: (model: string, error: unknown) => void = () => undefined
): Promise<T> {
  try {
    return await request(primaryModel);
  } catch (primaryError) {
    onFailure(primaryModel, primaryError);
    const status = getProviderStatus(primaryError);
    if ((status !== 503 && status !== 504) || fallbackModel === primaryModel) {
      throw primaryError;
    }
  }

  try {
    return await request(fallbackModel);
  } catch (fallbackError) {
    onFailure(fallbackModel, fallbackError);
    throw fallbackError;
  }
}

function providerError(error: unknown): HttpError {
  const status = getProviderStatus(error);

  if (status === 401 || status === 403) {
    return new HttpError(403, "La clé Gemini de ce membre est invalide ou n'a pas accès au modèle.");
  }
  if (status === 429) {
    return new HttpError(429, 'Limite Gemini atteinte pour ce membre (débit ou quota). Réessayez plus tard.');
  }
  if (status === 503 || status === 504) {
    return new HttpError(503, 'Gemini est temporairement indisponible. Réessayez cette photo plus tard.');
  }
  return new HttpError(502, "L'analyse Gemini a échoué. Réessayez cette photo.");
}

function generateWithModel(
  ai: GoogleGenAI,
  model: string,
  data: string,
  mimeType: string
) {
  return ai.models.generateContent({
    model,
    contents: [
      { inlineData: { mimeType, data } },
      'Analyse cette photo de visite technique conformément aux instructions système strictes et renvoie le diagnostic au format JSON.',
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.15,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });
}

export async function analyzePhoto(body: unknown, apiKey: string): Promise<DiagnosticResult> {
  const { data, mimeType } = validateImage(body);
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 60_000 } });

  let response;
  try {
    response = await withGeminiFallback(
      (model) => generateWithModel(ai, model, data, mimeType),
      PRIMARY_MODEL,
      FALLBACK_MODEL,
      (model, error) => logProviderFailure(model, error, apiKey)
    );
  } catch (error) {
    throw providerError(error);
  }

  if (!response.text) {
    throw new HttpError(502, 'Gemini a renvoyé un diagnostic vide.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new HttpError(502, 'Gemini a renvoyé un diagnostic illisible.');
  }

  return validateResult(parsed);
}
