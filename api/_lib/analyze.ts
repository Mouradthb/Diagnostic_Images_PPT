import { GoogleGenAI, Type } from '@google/genai';
import type { DiagnosticResult, DiagnosticNiveau } from '../../src/types';
import { HttpError } from './httpError.js';
import { SYSTEM_INSTRUCTION } from './prompt.js';

const MODEL = 'gemini-3.6-flash';
const MAX_IMAGE_BYTES = 3_000_000;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const NIVEAUX: DiagnosticNiveau[] = [
  'Entretien',
  'Signalement',
  'Curatif Niveau 1',
  'Curatif Niveau 2',
  'Curatif Niveau 3',
  'Travaux énergétiques',
];

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

function validateResult(value: unknown): DiagnosticResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(502, 'Le diagnostic reçu est invalide. Réessayez cette photo.');
  }

  const result = value as Record<string, unknown>;
  if (!NIVEAUX.includes(result.niveau as DiagnosticNiveau)
    || typeof result.description_probleme !== 'string'
    || !result.description_probleme.trim()
    || typeof result.remediation_proposee !== 'string'
    || !result.remediation_proposee.trim()) {
    throw new HttpError(502, 'Le diagnostic reçu est incomplet. Réessayez cette photo.');
  }

  return result as unknown as DiagnosticResult;
}

function providerError(error: unknown): HttpError {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? Number(error.status)
    : 0;

  if (status === 401 || status === 403) {
    return new HttpError(403, "La clé Gemini de ce membre est invalide ou n'a pas accès au modèle.");
  }
  if (status === 429) {
    return new HttpError(429, 'Le quota Gemini de ce membre est atteint. Réessayez plus tard.');
  }
  if (status === 503 || status === 504) {
    return new HttpError(503, 'Gemini est temporairement indisponible. Réessayez cette photo plus tard.');
  }
  return new HttpError(502, "L'analyse Gemini a échoué. Réessayez cette photo.");
}

export async function analyzePhoto(body: unknown, apiKey: string): Promise<DiagnosticResult> {
  const { data, mimeType } = validateImage(body);
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 60_000 } });

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        { inlineData: { mimeType, data } },
        'Analyse cette photo de visite technique conformément aux instructions système strictes et renvoie le diagnostic au format JSON.',
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.15,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            niveau: { type: Type.STRING, enum: NIVEAUX },
            description_probleme: { type: Type.STRING },
            remediation_proposee: { type: Type.STRING },
          },
          required: ['niveau', 'description_probleme', 'remediation_proposee'],
        },
      },
    });
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
