import type { DiagnosticNiveau, InspectionImageItem } from '../../src/types.ts';
import { createEmptyPart1ReportData, type Part1ReportData } from '../../src/part1/reportData.ts';
import { createEmptyPart3ReportData, type Part3ReportData } from '../../src/part3/reportData.ts';

export function completePart1Fixture(): Part1ReportData {
  const data = createEmptyPart1ReportData();
  data.rapport = { dateVisite: '05/09/2026', dateRapport: '12/09/2026', version: 'Finale' };
  data.copropriete = { nom: 'Résidence Validation', adresse: '12 rue des Tests, 75001 Paris' };
  data.donneurOrdre = { nom: 'Syndic Test', adresse: '4 place des Tests, 75002 Paris' };
  data.equipe = {
    chargeProjet: { nom: 'Camille Martin', fonction: 'Chargée de projet' },
    verificateur: { nom: 'Alex Durand', fonction: 'Vérificateur technique' },
    intervenantSite: { nom: 'Nora Petit' },
  };
  data.cadastre = { reference: 'AZ 0421' };
  data.batiment = {
    periodeConstruction: 'Entre 1980 et 1990',
    dateReglementCopropriete: '02/03/1986',
    dateImmatriculation: '17/06/2018',
    numeroImmatriculation: 'BB9876543',
    nombreBatiments: 2,
    nombreEntrees: 3,
    nombreLots: 48,
    nombreNiveaux: 5,
    nombreLotsPrincipaux: 32,
    typeChauffage: 'Collectif gaz',
    nombreLotsHabitation: 30,
    nombreAscenseurs: 2,
    shabApproximative: 2140.5,
    altitude: 183,
  };
  data.patrimoine = {
    aucunPerimetreProtection: 'concerne',
    sitePatrimonialRemarquable: 'non_concerne',
    abordsMonumentHistorique: 'non_concerne',
  };
  const file = { type: 'image/jpeg', size: 100 } as File;
  data.visuels = {
    photo_principale_copropriete: file,
    extrait_cadastral: file,
    vue_aerienne_rapprochee: file,
    vue_patrimoniale: file,
  };
  return data;
}

export function completePart3Fixture(): Part3ReportData {
  const data = createEmptyPart3ReportData();
  for (const table of Object.values(data.documentation) as Array<Record<string, { statut: 'transmis' | null }>>) {
    for (const row of Object.values(table)) row.statut = 'transmis';
  }
  return data;
}

export function diagnosticFixture(priority: DiagnosticNiveau = 'Curatif Niveau 1'): InspectionImageItem {
  return {
    id: 'diagnostic-1',
    file: { type: 'image/jpeg', size: 100 } as File,
    fileName: 'diagnostic-1.jpg',
    fileSize: 100,
    previewUrl: 'blob:test',
    localisation: 'non renseignée',
    analyzedLocalisation: 'non renseignée',
    status: 'completed',
    result: {
      statut_analyse: 'constat photographique indicatif',
      priorite: priority,
      famille: 'Famille de test',
      localisation: 'Parties communes',
      perimetre: 'indéterminé',
      etat_observations: 'Observation de test.',
      intervention: 'Intervention de test.',
      cout_estime_min_ttc_eur: 1000,
      cout_estime_max_ttc_eur: 1400,
      confiance: 'moyen',
    },
  };
}
