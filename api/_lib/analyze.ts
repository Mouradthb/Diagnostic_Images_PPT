import { GoogleGenAI, ThinkingLevel, Type, type ThinkingConfig } from '@google/genai';
import type { DiagnosticResult } from '../../src/types';
import {
  DIAGNOSTIC_NIVEAUX,
  NIVEAUX_CONFIANCE,
  PERIMETRES_APPARENTS,
  STATUTS_ANALYSE,
  LOCALISATIONS_PHOTO,
  LOCALISATION_LABELS,
  type LocalisationPhoto,
} from './diagnosticContract.js';
import { HttpError } from './httpError.js';
import { SYSTEM_INSTRUCTION } from './prompt.js';
import { getProviderStatus, providerError } from './providerFailure.js';

const PRIMARY_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash';
export function resolveFallbackModel(configuredFallbackModel: string | undefined): string {
  const model = configuredFallbackModel?.trim();
  // Gemini 2.5 Flash is refused for newly created Google projects. Keep old Vercel
  // configuration working while moving every fallback to the current stable model.
  return model === 'gemini-2.5-flash'
    ? 'gemini-3.5-flash-lite'
    : model || 'gemini-3.5-flash-lite';
}

const FALLBACK_MODEL = resolveFallbackModel(process.env.GEMINI_FALLBACK_MODEL);
const MAX_IMAGE_BYTES = 3_000_000;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MODEL_TIMEOUT_MS = 25_000;
const ANALYSIS_TIMEOUT_MS = 55_000;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    statut_analyse: { type: Type.STRING, enum: [...STATUTS_ANALYSE] },
    priorite: { type: Type.STRING, enum: [...DIAGNOSTIC_NIVEAUX] },
    famille: { type: Type.STRING },
    localisation: { type: Type.STRING },
    perimetre: { type: Type.STRING, enum: [...PERIMETRES_APPARENTS] },
    etat_observations: { type: Type.STRING },
    intervention: { type: Type.STRING },
    cout_estime_min_ttc_eur: { type: Type.INTEGER },
    cout_estime_max_ttc_eur: { type: Type.INTEGER },
    confiance: { type: Type.STRING, enum: [...NIVEAUX_CONFIANCE] },
  },
  required: [
    'statut_analyse', 'priorite', 'famille', 'localisation', 'perimetre',
    'etat_observations', 'intervention', 'cout_estime_min_ttc_eur',
    'cout_estime_max_ttc_eur', 'confiance',
  ],
};

function isExpectedImage(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
}

function validateImage(body: unknown): { data: string; mimeType: string; localisation: LocalisationPhoto; recoveryAttempt: boolean } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Une photo est requise.');
  }

  const { imageBase64, mimeType } = body as Record<string, unknown>;
  const recoveryAttempt = (body as Record<string, unknown>).recoveryAttempt;
  if (recoveryAttempt !== undefined && typeof recoveryAttempt !== 'boolean') {
    throw new HttpError(400, 'Option de reprise invalide.');
  }
  if (typeof imageBase64 !== 'string' || typeof mimeType !== 'string' || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new HttpError(400, 'Photo invalide. Formats acceptés : JPG, PNG et WEBP.');
  }

  const declaredLocalisation = (body as Record<string, unknown>).localisation;
  const localisation = declaredLocalisation === undefined ? 'non renseignée' : declaredLocalisation;
  if (!isOneOf(localisation, LOCALISATIONS_PHOTO)) {
    throw new HttpError(400, 'Localisation invalide. Choisissez Parties communes, Parties privatives ou Non renseignée.');
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

  return { data, mimeType, localisation: localisation as LocalisationPhoto, recoveryAttempt: recoveryAttempt === true };
}

function isOneOf(value: unknown, choices: readonly string[]): value is string {
  return typeof value === 'string' && choices.includes(value);
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isEstimatedCost(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10_000_000;
}

export function validateResult(value: unknown): DiagnosticResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(502, 'Le diagnostic reçu est invalide. Réessayez cette photo.');
  }

  const result = value as Record<string, unknown>;
  if (!isOneOf(result.statut_analyse, STATUTS_ANALYSE)
    || !isOneOf(result.priorite, DIAGNOSTIC_NIVEAUX)
    || !isNonEmptyText(result.famille)
    || !isNonEmptyText(result.localisation)
    || !isOneOf(result.perimetre, PERIMETRES_APPARENTS)
    || !isNonEmptyText(result.etat_observations)
    || !isNonEmptyText(result.intervention)
    || !isEstimatedCost(result.cout_estime_min_ttc_eur)
    || !isEstimatedCost(result.cout_estime_max_ttc_eur)
    || result.cout_estime_min_ttc_eur > result.cout_estime_max_ttc_eur
    || (result.cout_estime_min_ttc_eur === 0) !== (result.cout_estime_max_ttc_eur === 0)
    || !isOneOf(result.confiance, NIVEAUX_CONFIANCE)) {
    throw new HttpError(502, 'Le diagnostic reçu est incomplet. Réessayez cette photo.');
  }

  if (result.statut_analyse === 'image non exploitable'
    && (result.priorite !== 'À confirmer / expertise nécessaire' || result.confiance !== 'faible')) {
    throw new HttpError(502, 'Le diagnostic reçu est incohérent. Réessayez cette photo.');
  }
  if (result.statut_analyse === 'expertise nécessaire' && result.priorite !== 'À confirmer / expertise nécessaire') {
    throw new HttpError(502, 'Le diagnostic reçu est incohérent. Réessayez cette photo.');
  }
  if ((result.priorite === 'Entretien'
    || result.priorite === 'Signalement hors PPPT à vérifier'
    || result.priorite === 'À confirmer / expertise nécessaire')
    && (result.cout_estime_min_ttc_eur !== 0 || result.cout_estime_max_ttc_eur !== 0)) {
    throw new HttpError(502, 'Le chiffrage reçu est incohérent. Réessayez cette photo.');
  }

  return result as unknown as DiagnosticResult;
}

type AnalysisStage = 'provider' | 'response_empty' | 'response_json' | 'response_contract' | 'completed';
type AnalysisOutcome = 'attempt_failed' | 'success';

function logAnalysisEvent(
  outcome: AnalysisOutcome,
  localisation: LocalisationPhoto,
  stage: AnalysisStage,
  model?: string,
  upstreamStatus?: number
): void {
  const event = { outcome, localisation, stage, model, upstreamStatus };
  if (outcome === 'attempt_failed') {
    console.error('[Gemini] analysis event', event);
    return;
  }

  console.info('[Gemini] analysis event', event);
}

function logProviderFailure(localisation: LocalisationPhoto, model: string, error: unknown): void {
  logAnalysisEvent(
    'attempt_failed',
    localisation,
    'provider',
    model,
    getProviderStatus(error) || undefined
  );
}

export async function withGeminiFallback<T>(
  request: (model: string) => Promise<T>,
  primaryModel: string,
  fallbackModel: string,
  onFailure: (model: string, error: unknown) => void = () => undefined,
  signal?: AbortSignal
): Promise<T> {
  signal?.throwIfAborted();
  try {
    return await request(primaryModel);
  } catch (primaryError) {
    onFailure(primaryModel, primaryError);
    signal?.throwIfAborted();
    const status = getProviderStatus(primaryError);
    if ((status !== 503 && status !== 504) || fallbackModel === primaryModel) {
      throw primaryError;
    }
  }

  signal?.throwIfAborted();
  try {
    return await request(fallbackModel);
  } catch (fallbackError) {
    onFailure(fallbackModel, fallbackError);
    throw fallbackError;
  }
}

async function generateWithModel(
  ai: GoogleGenAI,
  model: string,
  data: string,
  mimeType: string,
  localisation: LocalisationPhoto,
  signal: AbortSignal
) {
  const thinkingConfig: ThinkingConfig | undefined = model.startsWith('gemini-3.')
    ? { thinkingLevel: ThinkingLevel.MINIMAL }
    : model.startsWith('gemini-2.5')
      ? { thinkingBudget: 0 }
      : undefined;

  const localisationContext = localisation === 'non renseignée'
    ? "Localisation déclarée par l'utilisateur : Non renseignée. Ne déduis pas le périmètre depuis ce seul champ ; utilise « indéterminé » lorsque la photo ne suffit pas."
    : `Localisation déclarée par l'utilisateur pour cette photo : ${LOCALISATION_LABELS[localisation]}.`;

  signal.throwIfAborted();
  const modelController = new AbortController();
  let timedOut = false;
  const onAbort = () => modelController.abort();
  signal.addEventListener('abort', onAbort, { once: true });
  const modelTimer = setTimeout(() => {
    timedOut = true;
    modelController.abort();
  }, MODEL_TIMEOUT_MS);

  try {
    return await ai.models.generateContent({
      model,
      contents: [
        { inlineData: { mimeType, data } },
        'Analyse cette photo de visite technique conformément aux instructions système strictes et renvoie le diagnostic au format JSON.'
          + `\n${localisationContext}`,
      ],
      config: {
        abortSignal: modelController.signal,
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.15,
        maxOutputTokens: 1600,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        ...(thinkingConfig ? { thinkingConfig } : {}),
      },
    });
  } catch (error) {
    // A local model deadline is transient, but a caller/total-budget abort must
    // never start another request. The outer signal gates the fallback.
    if (timedOut && !signal.aborted) {
      throw Object.assign(new Error('Gemini model deadline reached'), { status: 504 });
    }
    throw error;
  } finally {
    clearTimeout(modelTimer);
    signal.removeEventListener('abort', onAbort);
  }
}

export async function analyzePhoto(body: unknown, apiKey: string, callerSignal?: AbortSignal): Promise<DiagnosticResult> {
  const { data, mimeType, localisation, recoveryAttempt } = validateImage(body);
  if (callerSignal?.aborted) {
    throw new HttpError(499, 'Analyse annulée.', { code: 'request_aborted', canRetry: false });
  }
  let retryAfterHeader: string | null = null;
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: MODEL_TIMEOUT_MS,
      retryOptions: { attempts: 1 },
      fetch: async (input, init) => {
        retryAfterHeader = null;
        const response = await globalThis.fetch(input, init);
        retryAfterHeader = response.headers.get('Retry-After');
        return response;
      },
    },
  });
  const analysisController = new AbortController();
  const onCallerAbort = () => analysisController.abort();
  callerSignal?.addEventListener('abort', onCallerAbort, { once: true });
  const analysisTimer = setTimeout(() => analysisController.abort(), ANALYSIS_TIMEOUT_MS);

  let response;
  let selectedModel: string | undefined;
  try {
    response = await withGeminiFallback(
      (model) => {
        selectedModel = model;
        return generateWithModel(ai, model, data, mimeType, localisation, analysisController.signal);
      },
      recoveryAttempt ? FALLBACK_MODEL : PRIMARY_MODEL,
      FALLBACK_MODEL,
      (model, error) => logProviderFailure(localisation, model, error),
      analysisController.signal
    );
  } catch (error) {
    if (callerSignal?.aborted) {
      throw new HttpError(499, 'Analyse annulée.', { code: 'request_aborted', canRetry: false });
    }
    if (analysisController.signal.aborted) {
      throw providerError({ status: 504 });
    }
    throw providerError(error, retryAfterHeader);
  } finally {
    clearTimeout(analysisTimer);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }

  if (!response.text) {
    logAnalysisEvent('attempt_failed', localisation, 'response_empty', selectedModel);
    throw new HttpError(502, 'Gemini a renvoyé un diagnostic vide.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    logAnalysisEvent('attempt_failed', localisation, 'response_json', selectedModel);
    throw new HttpError(502, 'Gemini a renvoyé un diagnostic illisible.');
  }

  try {
    const diagnostic = validateResult(parsed);
    logAnalysisEvent('success', localisation, 'completed', selectedModel);
    return diagnostic;
  } catch (error) {
    logAnalysisEvent('attempt_failed', localisation, 'response_contract', selectedModel);
    throw error;
  }
}
