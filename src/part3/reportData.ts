/**
 * Source unique des données saisies pour la Partie 3 du rapport PPPT.
 *
 * Les statuts documentaires et les visuels DPE restent séparés des données de
 * copropriété de Partie 1 et des diagnostics photographiques de Partie 2.
 */

export const STATUTS_DOCUMENTAIRES_PARTIE3 = [
  'transmis',
  'non_transmis',
  'non_concerne',
] as const;

export type StatutDocumentairePartie3 = (typeof STATUTS_DOCUMENTAIRES_PARTIE3)[number];

export const LIBELLES_STATUTS_DOCUMENTAIRES_PARTIE3: Record<StatutDocumentairePartie3, string> = {
  transmis: 'Transmis',
  non_transmis: 'Non transmis',
  non_concerne: 'Non concerné',
};

export interface LigneDocumentairePartie3 {
  /** Mandatory choice; null is used only while the user fills the draft. */
  statut: StatutDocumentairePartie3 | null;
  /** Optional project-specific clarification. */
  commentaire: string | null;
}

/**
 * Fixed catalogue used by the future form and PPT tables. Legal explanatory
 * text remains presentation content, not user-entered report data.
 */
export const TABLEAUX_DOCUMENTAIRES_PARTIE3 = [
  {
    id: 'documentsReglementairesAdministratifs',
    titre: '5.1 Documents réglementaires et administratifs',
    lignes: [
      { id: 'assuranceCopropriete', designation: 'Assurance de la copropriété' },
      { id: 'immatriculationCopropriete', designation: 'Immatriculation de la copropriété' },
      { id: 'ficheSynthetique', designation: 'Fiche synthétique' },
      { id: 'reglementCopropriete', designation: 'Règlement de copropriété' },
      { id: 'compteBancaireSepare', designation: 'Compte bancaire séparé' },
      { id: 'procesVerbauxAg', designation: 'Procès-verbaux des assemblées générales' },
    ],
  },
  {
    id: 'diagnosticsTechniquesObligatoires',
    titre: '5.2 Diagnostics techniques obligatoires',
    lignes: [
      { id: 'dta', designation: 'Dossier Technique Amiante (DTA)' },
      { id: 'crepPartiesCommunes', designation: 'Diagnostic plomb – Parties communes (CREP)' },
      { id: 'dtg', designation: 'Diagnostic Technique Global (DTG)' },
      { id: 'termites', designation: 'Diagnostic termites' },
      { id: 'merules', designation: 'Diagnostic mérules' },
    ],
  },
  {
    id: 'contratsEntretien',
    titre: '5.3 Contrat d’entretien',
    lignes: [
      { id: 'maintenanceChaudiereMoins400Kw', designation: 'Maintenance des chaudières collectives < 400 kW' },
      { id: 'maintenanceChaudierePlus400Kw', designation: 'Maintenance des chaudières collectives > 400 kW' },
      { id: 'carnetEntretienImmeuble', designation: 'Carnet d’entretien de l’immeuble' },
    ],
  },
  {
    id: 'securiteIncendie',
    titre: '5.4 Sécurité incendie',
    lignes: [
      { id: 'registreSecurite', designation: 'Registre de sécurité' },
      { id: 'affichageConsignesPartiesCommunes', designation: 'Affichage des consignes de sécurité – Parties communes' },
      { id: 'verificationsPeriodiquesInstallations', designation: 'Vérifications périodiques des installations incendie' },
    ],
  },
] as const;

export interface DonneesDocumentairesPartie3 {
  documentsReglementairesAdministratifs: {
    assuranceCopropriete: LigneDocumentairePartie3;
    immatriculationCopropriete: LigneDocumentairePartie3;
    ficheSynthetique: LigneDocumentairePartie3;
    reglementCopropriete: LigneDocumentairePartie3;
    compteBancaireSepare: LigneDocumentairePartie3;
    procesVerbauxAg: LigneDocumentairePartie3;
  };
  diagnosticsTechniquesObligatoires: {
    dta: LigneDocumentairePartie3;
    crepPartiesCommunes: LigneDocumentairePartie3;
    dtg: LigneDocumentairePartie3;
    termites: LigneDocumentairePartie3;
    merules: LigneDocumentairePartie3;
  };
  contratsEntretien: {
    maintenanceChaudiereMoins400Kw: LigneDocumentairePartie3;
    maintenanceChaudierePlus400Kw: LigneDocumentairePartie3;
    carnetEntretienImmeuble: LigneDocumentairePartie3;
  };
  securiteIncendie: {
    registreSecurite: LigneDocumentairePartie3;
    affichageConsignesPartiesCommunes: LigneDocumentairePartie3;
    verificationsPeriodiquesInstallations: LigneDocumentairePartie3;
  };
}

/** Identifiers shared by the controlled form and the editable PPT tables. */
export type TableauDocumentairePartie3Id = keyof DonneesDocumentairesPartie3;
export type LigneDocumentairePartie3Id<Tableau extends TableauDocumentairePartie3Id> =
  keyof DonneesDocumentairesPartie3[Tableau];

export const ROLES_VISUELS_DPE_PARTIE3 = [
  'etiquette_energetique_etat_initial',
  'etiquette_energetique_scenario_renovation_ambitieux',
] as const;

export type RoleVisuelDpePartie3 = (typeof ROLES_VISUELS_DPE_PARTIE3)[number];

/** Each DPE visual is optional and remains local to the browser session. */
export type VisuelsDpePartie3 = Partial<Record<RoleVisuelDpePartie3, File>>;

export interface DpeCollectifPartie3 {
  visuels: VisuelsDpePartie3;
}

export interface Part3ReportData {
  documentation: DonneesDocumentairesPartie3;
  dpeCollectif: DpeCollectifPartie3;
}

/** Status choices must be made for all rows; comments and DPE visuals stay optional. */
export const PART3_REQUIRED_STATUS_PATHS = [
  'documentation.documentsReglementairesAdministratifs.assuranceCopropriete.statut',
  'documentation.documentsReglementairesAdministratifs.immatriculationCopropriete.statut',
  'documentation.documentsReglementairesAdministratifs.ficheSynthetique.statut',
  'documentation.documentsReglementairesAdministratifs.reglementCopropriete.statut',
  'documentation.documentsReglementairesAdministratifs.compteBancaireSepare.statut',
  'documentation.documentsReglementairesAdministratifs.procesVerbauxAg.statut',
  'documentation.diagnosticsTechniquesObligatoires.dta.statut',
  'documentation.diagnosticsTechniquesObligatoires.crepPartiesCommunes.statut',
  'documentation.diagnosticsTechniquesObligatoires.dtg.statut',
  'documentation.diagnosticsTechniquesObligatoires.termites.statut',
  'documentation.diagnosticsTechniquesObligatoires.merules.statut',
  'documentation.contratsEntretien.maintenanceChaudiereMoins400Kw.statut',
  'documentation.contratsEntretien.maintenanceChaudierePlus400Kw.statut',
  'documentation.contratsEntretien.carnetEntretienImmeuble.statut',
  'documentation.securiteIncendie.registreSecurite.statut',
  'documentation.securiteIncendie.affichageConsignesPartiesCommunes.statut',
  'documentation.securiteIncendie.verificationsPeriodiquesInstallations.statut',
] as const;

/** Values calculated later from eligible Part 2 diagnostics and assembled pages. */
export const DONNEES_DERIVEES_PARTIE3 = [
  'tableauRecapitulatifCuratifs',
  'totauxCuratifsParNiveau',
  'totalCuratifs',
  'statistiquesConclusion',
  'numerotationPages',
  'renvoisSommaire',
] as const;

/**
 * Part 2 exposes a lower and an upper estimate. The future recap uses the
 * rounded midpoint as its one editable display amount. An absent estimate
 * remains « À confirmer » and does not become 0 €.
 */
export const REGLE_CHIFFRAGE_CURATIF_PARTIE3 = {
  methode: 'moyenne_arrondie_des_bornes_ttc',
  libelle: 'Estimation IA indicative — à vérifier par un ingénieur',
  description: 'Lorsque les deux bornes sont positives, afficher la moyenne arrondie à l’euro. Sinon afficher « À confirmer ».',
} as const;

/** Deferred content deliberately excluded from the Part 3 input model. */
export const DECISIONS_PARTIE3_A_CONFIRMER = [
  {
    id: 'donnees_scenarios_energetiques',
    description: 'Les tableaux détaillés de scénarios énergétiques restent présents mais ne reçoivent pas encore de données utilisateur.',
  },
  {
    id: 'annexe_georisques',
    description: 'Le modèle annonce une annexe Géorisques, mais son contenu n’est pas fourni et n’est pas encore intégré.',
  },
] as const;

function ligneVide(): LigneDocumentairePartie3 {
  return { statut: null, commentaire: null };
}

/** Supplies a complete draft shape without inserting project or model-example data. */
export function createEmptyPart3ReportData(): Part3ReportData {
  return {
    documentation: {
      documentsReglementairesAdministratifs: {
        assuranceCopropriete: ligneVide(),
        immatriculationCopropriete: ligneVide(),
        ficheSynthetique: ligneVide(),
        reglementCopropriete: ligneVide(),
        compteBancaireSepare: ligneVide(),
        procesVerbauxAg: ligneVide(),
      },
      diagnosticsTechniquesObligatoires: {
        dta: ligneVide(),
        crepPartiesCommunes: ligneVide(),
        dtg: ligneVide(),
        termites: ligneVide(),
        merules: ligneVide(),
      },
      contratsEntretien: {
        maintenanceChaudiereMoins400Kw: ligneVide(),
        maintenanceChaudierePlus400Kw: ligneVide(),
        carnetEntretienImmeuble: ligneVide(),
      },
      securiteIncendie: {
        registreSecurite: ligneVide(),
        affichageConsignesPartiesCommunes: ligneVide(),
        verificationsPeriodiquesInstallations: ligneVide(),
      },
    },
    dpeCollectif: { visuels: {} },
  };
}
