import {
  ROLES_VISUELS_PARTIE1,
  VERSIONS_RAPPORT,
  type Part1ReportData,
  type RoleVisuelPartie1,
} from '../part1/reportData';
import { PART1_VISUAL_FILE_POLICY } from '../part1/reportDataValidation';
import {
  ROLES_VISUELS_DPE_PARTIE3,
  STATUTS_DOCUMENTAIRES_PARTIE3,
  TABLEAUX_DOCUMENTAIRES_PARTIE3,
  type DonneesDocumentairesPartie3,
  type Part3ReportData,
  type RoleVisuelDpePartie3,
} from '../part3/reportData';
import { PART3_DPE_VISUAL_FILE_POLICY } from '../part3/reportDataValidation';

export const PROJECT_FILE_FORMAT = 'france-verte-pppt-project';
export const PROJECT_FILE_SCHEMA_VERSION = 1;
export const MAX_PROJECT_FILE_BYTES = 170_000_000;

interface SerializedVisual {
  name: string;
  type: string;
  size: number;
  base64: string;
}

interface ProjectFileV1 {
  format: typeof PROJECT_FILE_FORMAT;
  schemaVersion: typeof PROJECT_FILE_SCHEMA_VERSION;
  savedAt: string;
  part1: Omit<Part1ReportData, 'visuels'> & {
    visuels: Partial<Record<RoleVisuelPartie1, SerializedVisual>>;
  };
  part3: Omit<Part3ReportData, 'dpeCollectif'> & {
    dpeCollectif: { visuels: Partial<Record<RoleVisuelDpePartie3, SerializedVisual>> };
  };
}

export interface ProjectDraft {
  part1Data: Part1ReportData;
  part3Data: Part3ReportData;
}

function fail(path: string, message: string): never {
  throw new Error(`${path} : ${message}`);
}

function record(value: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(path, 'objet attendu.');
  }
  const input = value as Record<string, unknown>;
  for (const key of keys) {
    if (!Object.hasOwn(input, key)) fail(`${path}.${key}`, 'champ manquant.');
  }
  for (const key of Object.keys(input)) {
    if (!keys.includes(key)) fail(`${path}.${key}`, 'champ non reconnu.');
  }
  return input;
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(path, 'objet attendu.');
  }
  return value as Record<string, unknown>;
}

function nullableText(value: unknown, path: string): string | null {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  return fail(path, 'texte ou null attendu.');
}

function nullableNumber(value: unknown, path: string): number | null {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fail(path, 'nombre fini ou null attendu.');
}

function nullableChoice<T extends string>(value: unknown, path: string, choices: readonly T[]): T | null {
  if (value === null || choices.includes(value as T)) return value as T | null;
  return fail(path, `valeur non autorisée (${choices.join(', ')}).`);
}

function textFields<T extends string>(value: unknown, path: string, keys: readonly T[]): Record<T, string | null> {
  const input = record(value, path, keys);
  return Object.fromEntries(keys.map((key) => [key, nullableText(input[key], `${path}.${key}`)])) as Record<T, string | null>;
}

function decodeVisual(value: unknown, path: string, policy: { acceptedMimeTypes: readonly string[]; maxBytes: number }): File {
  const input = record(value, path, ['name', 'type', 'size', 'base64']);
  if (typeof input.name !== 'string' || input.name.length === 0) fail(`${path}.name`, 'nom de fichier invalide.');
  if (typeof input.type !== 'string' || !policy.acceptedMimeTypes.includes(input.type)) {
    fail(`${path}.type`, 'type de visuel non autorisé.');
  }
  if (typeof input.size !== 'number' || !Number.isInteger(input.size) || input.size < 0 || input.size > policy.maxBytes) {
    fail(`${path}.size`, 'taille de visuel invalide.');
  }
  if (typeof input.base64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.base64)) {
    fail(`${path}.base64`, 'contenu du visuel invalide.');
  }
  const binary = atob(input.base64);
  if (binary.length !== input.size) fail(`${path}.size`, 'la taille ne correspond pas au contenu.');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], input.name, { type: input.type });
}

function decodeVisuals<Role extends string>(
  value: unknown,
  path: string,
  roles: readonly Role[],
  policy: { acceptedMimeTypes: readonly string[]; maxBytes: number },
): Partial<Record<Role, File>> {
  const input = object(value, path);
  const visuals: Partial<Record<Role, File>> = {};
  for (const [key, visual] of Object.entries(input)) {
    if (!roles.includes(key as Role)) fail(`${path}.${key}`, 'rôle de visuel non reconnu.');
    visuals[key as Role] = decodeVisual(visual, `${path}.${key}`, policy);
  }
  return visuals;
}

function parsePart1(value: unknown): Part1ReportData {
  const input = record(value, 'part1', [
    'rapport', 'copropriete', 'donneurOrdre', 'equipe', 'cadastre', 'batiment', 'patrimoine', 'visuels',
  ]);
  const rapport = record(input.rapport, 'part1.rapport', ['dateVisite', 'dateRapport', 'version']);
  const equipe = record(input.equipe, 'part1.equipe', ['chargeProjet', 'verificateur', 'intervenantSite']);
  const batiment = record(input.batiment, 'part1.batiment', [
    'periodeConstruction', 'dateReglementCopropriete', 'dateImmatriculation', 'numeroImmatriculation',
    'nombreBatiments', 'nombreEntrees', 'nombreLots', 'nombreNiveaux', 'nombreLotsPrincipaux',
    'typeChauffage', 'nombreLotsHabitation', 'nombreAscenseurs', 'shabApproximative', 'altitude',
  ]);
  const patrimoine = record(input.patrimoine, 'part1.patrimoine', [
    'aucunPerimetreProtection', 'sitePatrimonialRemarquable', 'abordsMonumentHistorique',
  ]);
  const heritageChoices = ['concerne', 'non_concerne'] as const;
  return {
    rapport: {
      dateVisite: nullableText(rapport.dateVisite, 'part1.rapport.dateVisite'),
      dateRapport: nullableText(rapport.dateRapport, 'part1.rapport.dateRapport'),
      version: nullableChoice(rapport.version, 'part1.rapport.version', VERSIONS_RAPPORT),
    },
    copropriete: textFields(input.copropriete, 'part1.copropriete', ['nom', 'adresse']),
    donneurOrdre: textFields(input.donneurOrdre, 'part1.donneurOrdre', ['nom', 'adresse']),
    equipe: {
      chargeProjet: textFields(equipe.chargeProjet, 'part1.equipe.chargeProjet', ['nom', 'fonction']),
      verificateur: textFields(equipe.verificateur, 'part1.equipe.verificateur', ['nom', 'fonction']),
      intervenantSite: textFields(equipe.intervenantSite, 'part1.equipe.intervenantSite', ['nom']),
    },
    cadastre: textFields(input.cadastre, 'part1.cadastre', ['reference']),
    batiment: {
      periodeConstruction: nullableText(batiment.periodeConstruction, 'part1.batiment.periodeConstruction'),
      dateReglementCopropriete: nullableText(batiment.dateReglementCopropriete, 'part1.batiment.dateReglementCopropriete'),
      dateImmatriculation: nullableText(batiment.dateImmatriculation, 'part1.batiment.dateImmatriculation'),
      numeroImmatriculation: nullableText(batiment.numeroImmatriculation, 'part1.batiment.numeroImmatriculation'),
      nombreBatiments: nullableNumber(batiment.nombreBatiments, 'part1.batiment.nombreBatiments'),
      nombreEntrees: nullableNumber(batiment.nombreEntrees, 'part1.batiment.nombreEntrees'),
      nombreLots: nullableNumber(batiment.nombreLots, 'part1.batiment.nombreLots'),
      nombreNiveaux: nullableNumber(batiment.nombreNiveaux, 'part1.batiment.nombreNiveaux'),
      nombreLotsPrincipaux: nullableNumber(batiment.nombreLotsPrincipaux, 'part1.batiment.nombreLotsPrincipaux'),
      typeChauffage: nullableText(batiment.typeChauffage, 'part1.batiment.typeChauffage'),
      nombreLotsHabitation: nullableNumber(batiment.nombreLotsHabitation, 'part1.batiment.nombreLotsHabitation'),
      nombreAscenseurs: nullableNumber(batiment.nombreAscenseurs, 'part1.batiment.nombreAscenseurs'),
      shabApproximative: nullableNumber(batiment.shabApproximative, 'part1.batiment.shabApproximative'),
      altitude: nullableNumber(batiment.altitude, 'part1.batiment.altitude'),
    },
    patrimoine: {
      aucunPerimetreProtection: nullableChoice(patrimoine.aucunPerimetreProtection, 'part1.patrimoine.aucunPerimetreProtection', heritageChoices),
      sitePatrimonialRemarquable: nullableChoice(patrimoine.sitePatrimonialRemarquable, 'part1.patrimoine.sitePatrimonialRemarquable', heritageChoices),
      abordsMonumentHistorique: nullableChoice(patrimoine.abordsMonumentHistorique, 'part1.patrimoine.abordsMonumentHistorique', heritageChoices),
    },
    visuels: decodeVisuals(input.visuels, 'part1.visuels', ROLES_VISUELS_PARTIE1, PART1_VISUAL_FILE_POLICY),
  };
}

function parsePart3(value: unknown): Part3ReportData {
  const input = record(value, 'part3', ['documentation', 'dpeCollectif']);
  const documentation = record(input.documentation, 'part3.documentation', TABLEAUX_DOCUMENTAIRES_PARTIE3.map((table) => table.id));
  const parsedDocumentation: Record<string, Record<string, { statut: typeof STATUTS_DOCUMENTAIRES_PARTIE3[number] | null; commentaire: string | null }>> = {};
  for (const table of TABLEAUX_DOCUMENTAIRES_PARTIE3) {
    const path = `part3.documentation.${table.id}`;
    const tableInput = record(documentation[table.id], path, table.lignes.map((row) => row.id));
    const parsedRows: Record<string, { statut: typeof STATUTS_DOCUMENTAIRES_PARTIE3[number] | null; commentaire: string | null }> = {};
    for (const row of table.lignes) {
      const rowPath = `${path}.${row.id}`;
      const rowInput = record(tableInput[row.id], rowPath, ['statut', 'commentaire']);
      parsedRows[row.id] = {
        statut: nullableChoice(rowInput.statut, `${rowPath}.statut`, STATUTS_DOCUMENTAIRES_PARTIE3),
        commentaire: nullableText(rowInput.commentaire, `${rowPath}.commentaire`),
      };
    }
    parsedDocumentation[table.id] = parsedRows;
  }
  const dpeCollectif = record(input.dpeCollectif, 'part3.dpeCollectif', ['visuels']);
  return {
    documentation: parsedDocumentation as unknown as DonneesDocumentairesPartie3,
    dpeCollectif: {
      visuels: decodeVisuals(dpeCollectif.visuels, 'part3.dpeCollectif.visuels', ROLES_VISUELS_DPE_PARTIE3, PART3_DPE_VISUAL_FILE_POLICY),
    },
  };
}

/** The saved file contains only editable Part 1 and Part 3 inputs. */
export function parseProjectFile(json: string): ProjectDraft {
  if (new Blob([json]).size > MAX_PROJECT_FILE_BYTES) throw new Error('Le fichier de projet dépasse 170 Mo.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Le fichier sélectionné ne contient pas un JSON valide.');
  }
  const input = record(parsed, 'projet', ['format', 'schemaVersion', 'savedAt', 'part1', 'part3']);
  if (input.format !== PROJECT_FILE_FORMAT) throw new Error('Ce fichier n’est pas un projet PPPT reconnu.');
  if (input.schemaVersion !== PROJECT_FILE_SCHEMA_VERSION) {
    throw new Error(`Version de projet non prise en charge : ${String(input.schemaVersion)}.`);
  }
  if (typeof input.savedAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.savedAt)
    || !Number.isFinite(Date.parse(input.savedAt))
    || new Date(input.savedAt).toISOString() !== input.savedAt) {
    fail('projet.savedAt', 'date de sauvegarde invalide.');
  }
  return {
    part1Data: parsePart1(input.part1),
    part3Data: parsePart3(input.part3),
  };
}

function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)));
  }
  return btoa(chunks.join(''));
}

async function encodeVisual(file: File, path: string, policy: { acceptedMimeTypes: readonly string[]; maxBytes: number }): Promise<SerializedVisual> {
  if (!(file instanceof Blob) || typeof file.name !== 'string' || file.name.length === 0
    || !policy.acceptedMimeTypes.includes(file.type) || file.size > policy.maxBytes) {
    return fail(path, 'visuel non pris en charge.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { name: file.name, type: file.type, size: file.size, base64: encodeBase64(bytes) };
}

async function encodeVisuals<Role extends string>(
  visuals: Partial<Record<Role, File>>,
  roles: readonly Role[],
  path: string,
  policy: { acceptedMimeTypes: readonly string[]; maxBytes: number },
): Promise<Partial<Record<Role, SerializedVisual>>> {
  const encoded: Partial<Record<Role, SerializedVisual>> = {};
  for (const role of roles) {
    const file = visuals[role];
    if (file) encoded[role] = await encodeVisual(file, `${path}.${role}`, policy);
  }
  return encoded;
}

/** Saves drafts too: null selections and empty text remain exactly as entered. */
export async function serializeProjectFile({ part1Data, part3Data }: ProjectDraft, savedAt = new Date()): Promise<string> {
  if (!Number.isFinite(savedAt.getTime())) throw new Error('Date de sauvegarde invalide.');
  const file: ProjectFileV1 = {
    format: PROJECT_FILE_FORMAT,
    schemaVersion: PROJECT_FILE_SCHEMA_VERSION,
    savedAt: savedAt.toISOString(),
    part1: {
      rapport: part1Data.rapport,
      copropriete: part1Data.copropriete,
      donneurOrdre: part1Data.donneurOrdre,
      equipe: part1Data.equipe,
      cadastre: part1Data.cadastre,
      batiment: part1Data.batiment,
      patrimoine: part1Data.patrimoine,
      visuels: await encodeVisuals(part1Data.visuels, ROLES_VISUELS_PARTIE1, 'part1.visuels', PART1_VISUAL_FILE_POLICY),
    },
    part3: {
      documentation: part3Data.documentation,
      dpeCollectif: {
        visuels: await encodeVisuals(part3Data.dpeCollectif.visuels, ROLES_VISUELS_DPE_PARTIE3, 'part3.dpeCollectif.visuels', PART3_DPE_VISUAL_FILE_POLICY),
      },
    },
  };
  // Verify the editable values with the same schema used by import, without
  // decoding image bytes a second time.
  parsePart1({ ...file.part1, visuels: {} });
  parsePart3({ ...file.part3, dpeCollectif: { visuels: {} } });
  const json = JSON.stringify(file);
  if (new Blob([json]).size > MAX_PROJECT_FILE_BYTES) throw new Error('Le projet dépasse la limite de 170 Mo.');
  return json;
}

function hasEnteredValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (value instanceof Blob) return true;
  if (typeof value !== 'object') return true;
  return Object.values(value).some(hasEnteredValue);
}

export function hasProjectFormData({ part1Data, part3Data }: ProjectDraft): boolean {
  return hasEnteredValue(part1Data) || hasEnteredValue(part3Data);
}

/** Validation finishes before the caller can replace either controlled form. */
export function prepareProjectImport(
  json: string,
  current: ProjectDraft,
  confirmReplace: () => boolean,
): ProjectDraft | null {
  const restored = parseProjectFile(json);
  if (hasProjectFormData(current) && !confirmReplace()) return null;
  return restored;
}

export function createProjectFileName(part1Data: Part1ReportData, savedAt = new Date()): string {
  const residence = (part1Data.copropriete.nom ?? 'Projet')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'Projet';
  return `PPPT_${residence}_${savedAt.toISOString().slice(0, 10)}.json`;
}
