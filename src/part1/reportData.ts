/**
 * Source unique des données saisies pour la future Partie 1 du rapport PPPT.
 *
 * Ce contrat est volontairement indépendant de `DiagnosticResult` et
 * `InspectionImageItem` : les visuels de Partie 1 ne sont pas des photos de
 * diagnostic et ne doivent pas alimenter `/api/analyze`.
 */

export type StatutPatrimonial = 'concerne' | 'non_concerne';
export const VERSIONS_RAPPORT = ['Initiale', 'Finale'] as const;
export type VersionRapport = (typeof VERSIONS_RAPPORT)[number];

export const ROLES_VISUELS_PARTIE1 = [
  'photo_principale_copropriete',
  'extrait_cadastral',
  'vue_aerienne_rapprochee',
  'vue_patrimoniale',
] as const;

export type RoleVisuelPartie1 = (typeof ROLES_VISUELS_PARTIE1)[number];

/**
 * The role is the record key. A draft can be incomplete while the user fills
 * the form, hence Partial. Validation requires every role before the Part 1
 * report can be generated. File name, MIME type and size remain properties of
 * File so the same metadata is never stored twice.
 */
export type VisuelsPartie1 = Partial<Record<RoleVisuelPartie1, File>>;

export interface InformationsRapport {
  /** Date de présentation dans le modèle PowerPoint : JJ/MM/AAAA. */
  dateVisite: string | null;
  /** Date de présentation dans le modèle PowerPoint : JJ/MM/AAAA. */
  dateRapport: string | null;
  version: VersionRapport | null;
}

export interface CoproprietePartie1 {
  /** Source unique du nom affiché comme copropriété ou résidence. */
  nom: string | null;
  /** Source unique des adresses de couverture, de site et de localisation. */
  adresse: string | null;
}

export interface DonneurOrdrePartie1 {
  nom: string | null;
  adresse: string | null;
}

export interface CollaborateurRapport {
  nom: string | null;
  fonction: string | null;
}

export interface EquipeRapportPartie1 {
  chargeProjet: CollaborateurRapport;
  verificateur: CollaborateurRapport;
  intervenantSite: Pick<CollaborateurRapport, 'nom'>;
}

export interface InformationsCadastrales {
  reference: string | null;
}

export interface CaracteristiquesBatiment {
  /** Peut être une période, par exemple « Entre 2001 et 2010 ». */
  periodeConstruction: string | null;
  dateReglementCopropriete: string | null;
  dateImmatriculation: string | null;
  numeroImmatriculation: string | null;
  nombreBatiments: number | null;
  nombreEntrees: number | null;
  nombreLots: number | null;
  nombreNiveaux: number | null;
  nombreLotsPrincipaux: number | null;
  typeChauffage: string | null;
  nombreLotsHabitation: number | null;
  nombreAscenseurs: number | null;
  shabApproximative: number | null;
  altitude: number | null;
}

export interface StatutPatrimonialPartie1 {
  /** « Votre situation » is only the UI section title for these three choices. */
  aucunPerimetreProtection: StatutPatrimonial | null;
  sitePatrimonialRemarquable: StatutPatrimonial | null;
  abordsMonumentHistorique: StatutPatrimonial | null;
}

export interface Part1ReportData {
  rapport: InformationsRapport;
  copropriete: CoproprietePartie1;
  donneurOrdre: DonneurOrdrePartie1;
  equipe: EquipeRapportPartie1;
  cadastre: InformationsCadastrales;
  batiment: CaracteristiquesBatiment;
  patrimoine: StatutPatrimonialPartie1;
  visuels: VisuelsPartie1;
}

/**
 * These values will be calculated later from Part1ReportData and the assembled
 * presentation. They are intentionally not user-editable fields of the model.
 */
export const DONNEES_DERIVEES_PARTIE1 = [
  'texteMission',
  'textePiedPage',
  'nombreTotalPages',
  'numerotationPages',
  'renvoisSommaire',
] as const;

/**
 * Points that still need a delivery decision. The mandatory-data policy and
 * the meaning of « Votre situation » have been confirmed and are therefore
 * deliberately absent from this list.
 */
export const DECISIONS_PARTIE1_A_CONFIRMER = [
  {
    id: 'origine_des_cartes',
    description: 'La Géoplateforme nationale est la source retenue pour les futures cartes générées ; les paramètres exacts de récupération et de composition restent à implémenter.',
  },
] as const;

/** Supplies a complete draft shape without inventing values for a copropriété. */
export function createEmptyPart1ReportData(): Part1ReportData {
  return {
    rapport: {
      dateVisite: null,
      dateRapport: null,
      version: null,
    },
    copropriete: {
      nom: null,
      adresse: null,
    },
    donneurOrdre: {
      nom: null,
      adresse: null,
    },
    equipe: {
      chargeProjet: { nom: null, fonction: null },
      verificateur: { nom: null, fonction: null },
      intervenantSite: { nom: null },
    },
    cadastre: {
      reference: null,
    },
    batiment: {
      periodeConstruction: null,
      dateReglementCopropriete: null,
      dateImmatriculation: null,
      numeroImmatriculation: null,
      nombreBatiments: null,
      nombreEntrees: null,
      nombreLots: null,
      nombreNiveaux: null,
      nombreLotsPrincipaux: null,
      typeChauffage: null,
      nombreLotsHabitation: null,
      nombreAscenseurs: null,
      shabApproximative: null,
      altitude: null,
    },
    patrimoine: {
      aucunPerimetreProtection: null,
      sitePatrimonialRemarquable: null,
      abordsMonumentHistorique: null,
    },
    visuels: {},
  };
}
