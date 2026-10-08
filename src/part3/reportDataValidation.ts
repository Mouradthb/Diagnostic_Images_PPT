import {
  DECISIONS_PARTIE3_A_CONFIRMER,
  ROLES_VISUELS_DPE_PARTIE3,
  STATUTS_DOCUMENTAIRES_PARTIE3,
  type LigneDocumentairePartie3,
  type Part3ReportData,
  type RoleVisuelDpePartie3,
  type StatutDocumentairePartie3,
} from './reportData';

/** DPE captures follow the same browser-import limits as the current report visuals. */
export const PART3_DPE_VISUAL_FILE_POLICY = {
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  maxBytes: 20_000_000,
} as const;

export type Part3ValidationIssueCode =
  | 'champ_requis'
  | 'statut_documentaire_invalide'
  | 'commentaire_vide'
  | 'commentaire_invalide'
  | 'visuel_invalide'
  | 'type_visuel_invalide'
  | 'taille_visuel_invalide';

export interface Part3ValidationIssue {
  path: string;
  code: Part3ValidationIssueCode;
  message: string;
}

export interface Part3ValidationOptions {
  dpeVisualFilePolicy?: {
    acceptedMimeTypes: readonly string[];
    maxBytes: number;
  };
}

export interface Part3ValidationResult {
  issues: Part3ValidationIssue[];
  isValid: boolean;
  openDecisions: typeof DECISIONS_PARTIE3_A_CONFIRMER;
}

function issue(path: string, code: Part3ValidationIssueCode, message: string): Part3ValidationIssue {
  return { path, code, message };
}

function isDocumentStatus(value: unknown): value is StatutDocumentairePartie3 {
  return (STATUTS_DOCUMENTAIRES_PARTIE3 as readonly unknown[]).includes(value);
}

function isFileLike(value: unknown): value is Pick<File, 'type' | 'size'> {
  return typeof value === 'object' && value !== null
    && typeof (value as { type?: unknown }).type === 'string'
    && typeof (value as { size?: unknown }).size === 'number';
}

function documentaryRows(data: Part3ReportData): readonly { path: string; value: LigneDocumentairePartie3 | undefined }[] {
  const { documentation } = data;
  return [
    { path: 'documentation.documentsReglementairesAdministratifs.assuranceCopropriete', value: documentation.documentsReglementairesAdministratifs?.assuranceCopropriete },
    { path: 'documentation.documentsReglementairesAdministratifs.immatriculationCopropriete', value: documentation.documentsReglementairesAdministratifs?.immatriculationCopropriete },
    { path: 'documentation.documentsReglementairesAdministratifs.ficheSynthetique', value: documentation.documentsReglementairesAdministratifs?.ficheSynthetique },
    { path: 'documentation.documentsReglementairesAdministratifs.reglementCopropriete', value: documentation.documentsReglementairesAdministratifs?.reglementCopropriete },
    { path: 'documentation.documentsReglementairesAdministratifs.compteBancaireSepare', value: documentation.documentsReglementairesAdministratifs?.compteBancaireSepare },
    { path: 'documentation.documentsReglementairesAdministratifs.procesVerbauxAg', value: documentation.documentsReglementairesAdministratifs?.procesVerbauxAg },
    { path: 'documentation.diagnosticsTechniquesObligatoires.dta', value: documentation.diagnosticsTechniquesObligatoires?.dta },
    { path: 'documentation.diagnosticsTechniquesObligatoires.crepPartiesCommunes', value: documentation.diagnosticsTechniquesObligatoires?.crepPartiesCommunes },
    { path: 'documentation.diagnosticsTechniquesObligatoires.dtg', value: documentation.diagnosticsTechniquesObligatoires?.dtg },
    { path: 'documentation.diagnosticsTechniquesObligatoires.termites', value: documentation.diagnosticsTechniquesObligatoires?.termites },
    { path: 'documentation.diagnosticsTechniquesObligatoires.merules', value: documentation.diagnosticsTechniquesObligatoires?.merules },
    { path: 'documentation.contratsEntretien.maintenanceChaudiereMoins400Kw', value: documentation.contratsEntretien?.maintenanceChaudiereMoins400Kw },
    { path: 'documentation.contratsEntretien.maintenanceChaudierePlus400Kw', value: documentation.contratsEntretien?.maintenanceChaudierePlus400Kw },
    { path: 'documentation.contratsEntretien.carnetEntretienImmeuble', value: documentation.contratsEntretien?.carnetEntretienImmeuble },
    { path: 'documentation.securiteIncendie.registreSecurite', value: documentation.securiteIncendie?.registreSecurite },
    { path: 'documentation.securiteIncendie.affichageConsignesPartiesCommunes', value: documentation.securiteIncendie?.affichageConsignesPartiesCommunes },
    { path: 'documentation.securiteIncendie.verificationsPeriodiquesInstallations', value: documentation.securiteIncendie?.verificationsPeriodiquesInstallations },
  ];
}

function validateDocumentaryRow(
  value: LigneDocumentairePartie3 | undefined,
  path: string,
  issues: Part3ValidationIssue[],
): void {
  if (!value || typeof value !== 'object') {
    issues.push(issue(path, 'champ_requis', 'Cette ligne documentaire est obligatoire.'));
    return;
  }
  if (value.statut === null || value.statut === undefined) {
    issues.push(issue(`${path}.statut`, 'champ_requis', 'Choisissez un statut documentaire.'));
  } else if (!isDocumentStatus(value.statut)) {
    issues.push(issue(`${path}.statut`, 'statut_documentaire_invalide', 'Le statut doit être « Transmis », « Non transmis » ou « Non concerné ».'));
  }
  if (value.commentaire === null) return;
  if (typeof value.commentaire !== 'string') {
    issues.push(issue(`${path}.commentaire`, 'commentaire_invalide', 'Le commentaire doit être un texte ou être laissé vide.'));
  } else if (value.commentaire.trim().length === 0) {
    issues.push(issue(`${path}.commentaire`, 'commentaire_vide', 'Le commentaire renseigné ne peut pas être vide.'));
  }
}

/**
 * Validates only user-entered Part 3 data. It never calls Gemini, mutates the
 * draft, or depends on Part 2 diagnostics; the curative recap is validated
 * during its later derivation and report assembly.
 */
export function validatePart3ReportData(
  data: Part3ReportData,
  options: Part3ValidationOptions = {},
): Part3ValidationResult {
  const issues: Part3ValidationIssue[] = [];
  const filePolicy = options.dpeVisualFilePolicy ?? PART3_DPE_VISUAL_FILE_POLICY;

  for (const row of documentaryRows(data)) validateDocumentaryRow(row.value, row.path, issues);

  for (const role of ROLES_VISUELS_DPE_PARTIE3) {
    const visual = data.dpeCollectif?.visuels?.[role];
    if (!visual) continue;
    const path = `dpeCollectif.visuels.${role}`;
    if (!isFileLike(visual)) {
      issues.push(issue(path, 'visuel_invalide', 'Le visuel DPE doit fournir un type et une taille de fichier.'));
      continue;
    }
    if (!(filePolicy.acceptedMimeTypes as readonly string[]).includes(visual.type)) {
      issues.push(issue(path, 'type_visuel_invalide', 'Seuls les fichiers JPG, PNG et WEBP sont acceptés.'));
    }
    if (!Number.isFinite(visual.size) || visual.size < 0 || visual.size > filePolicy.maxBytes) {
      issues.push(issue(path, 'taille_visuel_invalide', 'La taille du visuel DPE est invalide ou dépasse la limite autorisée.'));
    }
  }

  return { issues, isValid: issues.length === 0, openDecisions: DECISIONS_PARTIE3_A_CONFIRMER };
}
