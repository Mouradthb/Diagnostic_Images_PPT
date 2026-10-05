import {
  DECISIONS_PARTIE1_A_CONFIRMER,
  ROLES_VISUELS_PARTIE1,
  type Part1ReportData,
  type RoleVisuelPartie1,
  type StatutPatrimonial,
  type VersionRapport,
} from './reportData';

/** Current project image limits, kept isolated from the Part 2 import flow. */
export const PART1_VISUAL_FILE_POLICY = {
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  maxBytes: 20_000_000,
} as const;

export type Part1ValidationIssueCode =
  | 'champ_requis'
  | 'texte_vide'
  | 'version_invalide'
  | 'date_invalide'
  | 'entier_invalide'
  | 'nombre_invalide'
  | 'statut_patrimonial_invalide'
  | 'visuel_invalide'
  | 'type_visuel_invalide'
  | 'taille_visuel_invalide';

export interface Part1ValidationIssue {
  path: string;
  code: Part1ValidationIssueCode;
  message: string;
}

export interface Part1ValidationOptions {
  visualFilePolicy?: {
    acceptedMimeTypes: readonly string[];
    maxBytes: number;
  };
}

export interface Part1ValidationResult {
  issues: Part1ValidationIssue[];
  isValid: boolean;
  openDecisions: typeof DECISIONS_PARTIE1_A_CONFIRMER;
}

/** Every datum the user must provide before generating Part 1. */
export const PART1_REQUIRED_FIELD_PATHS = [
  'rapport.dateVisite',
  'rapport.dateRapport',
  'rapport.version',
  'copropriete.nom',
  'copropriete.adresse',
  'donneurOrdre.nom',
  'donneurOrdre.adresse',
  'equipe.chargeProjet.nom',
  'equipe.chargeProjet.fonction',
  'equipe.verificateur.nom',
  'equipe.verificateur.fonction',
  'equipe.intervenantSite.nom',
  'cadastre.reference',
  'batiment.periodeConstruction',
  'batiment.dateReglementCopropriete',
  'batiment.dateImmatriculation',
  'batiment.numeroImmatriculation',
  'batiment.nombreBatiments',
  'batiment.nombreEntrees',
  'batiment.nombreLots',
  'batiment.nombreNiveaux',
  'batiment.nombreLotsPrincipaux',
  'batiment.typeChauffage',
  'batiment.nombreLotsHabitation',
  'batiment.nombreAscenseurs',
  'batiment.shabApproximative',
  'batiment.altitude',
  'patrimoine.aucunPerimetreProtection',
  'patrimoine.sitePatrimonialRemarquable',
  'patrimoine.abordsMonumentHistorique',
] as const;

export type Part1RequiredFieldPath = (typeof PART1_REQUIRED_FIELD_PATHS)[number];

/** All four visuals are required, whatever their future source (import or generated map). */
export const PART1_REQUIRED_VISUAL_ROLES: readonly RoleVisuelPartie1[] = ROLES_VISUELS_PARTIE1;

function issue(path: string, code: Part1ValidationIssueCode, message: string): Part1ValidationIssue {
  return { path, code, message };
}

function hasText(value: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFrenchDate(value: string): boolean {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isPatrimonialStatus(value: unknown): value is StatutPatrimonial {
  return value === 'concerne' || value === 'non_concerne';
}

function isReportVersion(value: unknown): value is VersionRapport {
  return value === 'Initiale' || value === 'Finale';
}

function isFileLike(value: unknown): value is Pick<File, 'type' | 'size'> {
  return typeof value === 'object' && value !== null
    && typeof (value as { type?: unknown }).type === 'string'
    && typeof (value as { size?: unknown }).size === 'number';
}

function valueAtPath(data: Part1ReportData, path: Part1RequiredFieldPath): unknown {
  switch (path) {
    case 'rapport.dateVisite': return data.rapport.dateVisite;
    case 'rapport.dateRapport': return data.rapport.dateRapport;
    case 'rapport.version': return data.rapport.version;
    case 'copropriete.nom': return data.copropriete.nom;
    case 'copropriete.adresse': return data.copropriete.adresse;
    case 'donneurOrdre.nom': return data.donneurOrdre.nom;
    case 'donneurOrdre.adresse': return data.donneurOrdre.adresse;
    case 'equipe.chargeProjet.nom': return data.equipe.chargeProjet.nom;
    case 'equipe.chargeProjet.fonction': return data.equipe.chargeProjet.fonction;
    case 'equipe.verificateur.nom': return data.equipe.verificateur.nom;
    case 'equipe.verificateur.fonction': return data.equipe.verificateur.fonction;
    case 'equipe.intervenantSite.nom': return data.equipe.intervenantSite.nom;
    case 'cadastre.reference': return data.cadastre.reference;
    case 'batiment.periodeConstruction': return data.batiment.periodeConstruction;
    case 'batiment.dateReglementCopropriete': return data.batiment.dateReglementCopropriete;
    case 'batiment.dateImmatriculation': return data.batiment.dateImmatriculation;
    case 'batiment.numeroImmatriculation': return data.batiment.numeroImmatriculation;
    case 'batiment.nombreBatiments': return data.batiment.nombreBatiments;
    case 'batiment.nombreEntrees': return data.batiment.nombreEntrees;
    case 'batiment.nombreLots': return data.batiment.nombreLots;
    case 'batiment.nombreNiveaux': return data.batiment.nombreNiveaux;
    case 'batiment.nombreLotsPrincipaux': return data.batiment.nombreLotsPrincipaux;
    case 'batiment.typeChauffage': return data.batiment.typeChauffage;
    case 'batiment.nombreLotsHabitation': return data.batiment.nombreLotsHabitation;
    case 'batiment.nombreAscenseurs': return data.batiment.nombreAscenseurs;
    case 'batiment.shabApproximative': return data.batiment.shabApproximative;
    case 'batiment.altitude': return data.batiment.altitude;
    case 'patrimoine.aucunPerimetreProtection': return data.patrimoine.aucunPerimetreProtection;
    case 'patrimoine.sitePatrimonialRemarquable': return data.patrimoine.sitePatrimonialRemarquable;
    case 'patrimoine.abordsMonumentHistorique': return data.patrimoine.abordsMonumentHistorique;
  }
}

function hasRequiredValue(value: unknown): boolean {
  return typeof value === 'string' ? hasText(value) : value !== null && value !== undefined;
}

function validateText(value: string | null, path: string, issues: Part1ValidationIssue[]): void {
  if (value !== null && !hasText(value)) {
    issues.push(issue(path, 'texte_vide', 'Le texte renseigné ne peut pas être vide.'));
  }
}

function validateDate(value: string | null, path: string, issues: Part1ValidationIssue[]): void {
  validateText(value, path, issues);
  if (value !== null && hasText(value) && !isFrenchDate(value)) {
    issues.push(issue(path, 'date_invalide', 'La date doit respecter le format JJ/MM/AAAA et représenter une date existante.'));
  }
}

function validateInteger(value: number | null, path: string, issues: Part1ValidationIssue[]): void {
  if (value !== null && (!Number.isInteger(value) || value < 0)) {
    issues.push(issue(path, 'entier_invalide', 'La valeur doit être un entier positif ou nul.'));
  }
}

function validateNonNegativeNumber(value: number | null, path: string, issues: Part1ValidationIssue[]): void {
  if (value !== null && (!Number.isFinite(value) || value < 0)) {
    issues.push(issue(path, 'nombre_invalide', 'La valeur doit être un nombre positif ou nul.'));
  }
}

/**
 * Validates only the Part 1 data supplied by the user. It neither sends files
 * to an API nor mutates the draft. All Part 1 user data and visuals are
 * required by the confirmed business policy.
 */
export function validatePart1ReportData(
  data: Part1ReportData,
  options: Part1ValidationOptions = {},
): Part1ValidationResult {
  const issues: Part1ValidationIssue[] = [];
  const filePolicy = options.visualFilePolicy ?? PART1_VISUAL_FILE_POLICY;

  validateDate(data.rapport.dateVisite, 'rapport.dateVisite', issues);
  validateDate(data.rapport.dateRapport, 'rapport.dateRapport', issues);
  validateText(data.rapport.version, 'rapport.version', issues);
  if (data.rapport.version !== null && !isReportVersion(data.rapport.version)) {
    issues.push(issue('rapport.version', 'version_invalide', 'La version doit être « Initiale » ou « Finale ».'));
  }
  validateText(data.copropriete.nom, 'copropriete.nom', issues);
  validateText(data.copropriete.adresse, 'copropriete.adresse', issues);
  validateText(data.donneurOrdre.nom, 'donneurOrdre.nom', issues);
  validateText(data.donneurOrdre.adresse, 'donneurOrdre.adresse', issues);
  validateText(data.equipe.chargeProjet.nom, 'equipe.chargeProjet.nom', issues);
  validateText(data.equipe.chargeProjet.fonction, 'equipe.chargeProjet.fonction', issues);
  validateText(data.equipe.verificateur.nom, 'equipe.verificateur.nom', issues);
  validateText(data.equipe.verificateur.fonction, 'equipe.verificateur.fonction', issues);
  validateText(data.equipe.intervenantSite.nom, 'equipe.intervenantSite.nom', issues);
  validateText(data.cadastre.reference, 'cadastre.reference', issues);
  validateText(data.batiment.periodeConstruction, 'batiment.periodeConstruction', issues);
  validateDate(data.batiment.dateReglementCopropriete, 'batiment.dateReglementCopropriete', issues);
  validateDate(data.batiment.dateImmatriculation, 'batiment.dateImmatriculation', issues);
  validateText(data.batiment.numeroImmatriculation, 'batiment.numeroImmatriculation', issues);
  validateText(data.batiment.typeChauffage, 'batiment.typeChauffage', issues);

  validateInteger(data.batiment.nombreBatiments, 'batiment.nombreBatiments', issues);
  validateInteger(data.batiment.nombreEntrees, 'batiment.nombreEntrees', issues);
  validateInteger(data.batiment.nombreLots, 'batiment.nombreLots', issues);
  validateInteger(data.batiment.nombreNiveaux, 'batiment.nombreNiveaux', issues);
  validateInteger(data.batiment.nombreLotsPrincipaux, 'batiment.nombreLotsPrincipaux', issues);
  validateInteger(data.batiment.nombreLotsHabitation, 'batiment.nombreLotsHabitation', issues);
  validateInteger(data.batiment.nombreAscenseurs, 'batiment.nombreAscenseurs', issues);
  validateNonNegativeNumber(data.batiment.shabApproximative, 'batiment.shabApproximative', issues);
  // Altitude can be below sea level, so only reject non-finite values.
  if (data.batiment.altitude !== null && !Number.isFinite(data.batiment.altitude)) {
    issues.push(issue('batiment.altitude', 'nombre_invalide', 'L’altitude doit être un nombre fini.'));
  }

  const heritageEntries = Object.entries(data.patrimoine) as [string, unknown][];
  for (const [key, value] of heritageEntries) {
    if (value !== null && !isPatrimonialStatus(value)) {
      issues.push(issue(`patrimoine.${key}`, 'statut_patrimonial_invalide', 'Le statut doit être « concerne » ou « non_concerne ».'));
    }
  }

  for (const path of PART1_REQUIRED_FIELD_PATHS) {
    if (!hasRequiredValue(valueAtPath(data, path)) && !issues.some((entry) => entry.path === path)) {
      issues.push(issue(path, 'champ_requis', 'Ce champ est obligatoire pour générer la Partie 1.'));
    }
  }

  for (const role of PART1_REQUIRED_VISUAL_ROLES) {
    if (!data.visuels[role]) {
      issues.push(issue(`visuels.${role}`, 'champ_requis', 'Ce visuel est obligatoire pour générer la Partie 1.'));
    }
  }

  for (const role of ROLES_VISUELS_PARTIE1) {
    const visual = data.visuels[role];
    if (!visual) continue;
    const path = `visuels.${role}`;
    if (!isFileLike(visual)) {
      issues.push(issue(path, 'visuel_invalide', 'Le visuel doit fournir un type et une taille de fichier.'));
      continue;
    }
    if (!(filePolicy.acceptedMimeTypes as readonly string[]).includes(visual.type)) {
      issues.push(issue(path, 'type_visuel_invalide', 'Seuls les fichiers JPG, PNG et WEBP sont acceptés.'));
    }
    if (!Number.isFinite(visual.size) || visual.size < 0 || visual.size > filePolicy.maxBytes) {
      issues.push(issue(path, 'taille_visuel_invalide', 'La taille du visuel est invalide ou dépasse la limite autorisée.'));
    }
  }

  return {
    issues,
    isValid: issues.length === 0,
    openDecisions: DECISIONS_PARTIE1_A_CONFIRMER,
  };
}
