import assert from 'node:assert/strict';
import { File as NodeFile } from 'node:buffer';
import test from 'node:test';
import type { DiagnosticNiveau, DiagnosticResult, InspectionImageItem } from '../src/types.ts';
import {
  buildPart3CurativeSummary,
  deriveEstimatedCurativeAmount,
} from '../src/part3/curativeSummary.ts';
import {
  createEmptyPart3ReportData,
  DECISIONS_PARTIE3_A_CONFIRMER,
  DONNEES_DERIVEES_PARTIE3,
  PART3_REQUIRED_STATUS_PATHS,
  REGLE_CHIFFRAGE_CURATIF_PARTIE3,
  ROLES_VISUELS_DPE_PARTIE3,
  TABLEAUX_DOCUMENTAIRES_PARTIE3,
  type Part3ReportData,
} from '../src/part3/reportData.ts';
import {
  PART3_DPE_VISUAL_FILE_POLICY,
  validatePart3ReportData,
} from '../src/part3/reportDataValidation.ts';

function visualFile(contents: string, name: string, type: string): globalThis.File {
  return new NodeFile([contents], name, { type }) as unknown as globalThis.File;
}

function completedDocumentation(): Part3ReportData {
  const data = createEmptyPart3ReportData();
  const tables = Object.values(data.documentation) as Array<Record<string, { statut: 'transmis' | null }>>;
  for (const table of tables) {
    for (const row of Object.values(table)) row.statut = 'transmis';
  }
  return data;
}

function result(priority: DiagnosticNiveau, minimum: number, maximum: number, intervention = 'Travaux de test.'): DiagnosticResult {
  return {
    statut_analyse: 'constat photographique indicatif',
    priorite: priority,
    famille: 'Famille de test',
    localisation: 'Localisation de test',
    perimetre: 'indéterminé',
    etat_observations: 'Constat de test.',
    intervention,
    cout_estime_min_ttc_eur: minimum,
    cout_estime_max_ttc_eur: maximum,
    confiance: 'faible',
  };
}

function item(id: string, priority: DiagnosticNiveau, minimum: number, maximum: number): InspectionImageItem {
  return {
    id,
    file: {} as File,
    previewUrl: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
    fileName: `${id}.jpg`,
    fileSize: 1,
    status: 'completed',
    result: result(priority, minimum, maximum, `Travaux ${id}.`),
  };
}

test('Part 3 keeps only documentary answers and optional DPE visuals as user data', () => {
  const empty = createEmptyPart3ReportData() as unknown as Record<string, unknown>;
  assert.ok('documentation' in empty);
  assert.ok('dpeCollectif' in empty);
  assert.ok(!('copropriete' in empty));
  assert.ok(!('diagnostics' in empty));
  assert.ok(!('tableauRecapitulatifCuratifs' in empty));
  assert.equal(Object.values((empty.documentation as Record<string, Record<string, { statut: unknown }>>))
    .flatMap((table) => Object.values(table)).filter((row) => row.statut === null).length, 17);
  assert.deepEqual((empty.dpeCollectif as { visuels: unknown }).visuels, {});
  assert.equal(TABLEAUX_DOCUMENTAIRES_PARTIE3.length, 4);
  assert.equal(PART3_REQUIRED_STATUS_PATHS.length, 17);
  assert.deepEqual(ROLES_VISUELS_DPE_PARTIE3, [
    'etiquette_energetique_etat_initial',
    'etiquette_energetique_scenario_renovation_ambitieux',
  ]);
  assert.ok(DONNEES_DERIVEES_PARTIE3.includes('tableauRecapitulatifCuratifs'));
});

test('every Part 3 documentary status is required while comments and DPE captures remain optional', () => {
  const emptyResult = validatePart3ReportData(createEmptyPart3ReportData());
  assert.equal(emptyResult.isValid, false);
  assert.deepEqual(emptyResult.issues.map(({ path }) => path), [...PART3_REQUIRED_STATUS_PATHS]);

  const data = completedDocumentation();
  data.documentation.documentsReglementairesAdministratifs.assuranceCopropriete.commentaire = 'Police reçue le 12/09.';
  const result = validatePart3ReportData(data);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.issues, []);
});

test('Part 3 rejects an invalid documentary status and a whitespace-only optional comment', () => {
  const data = completedDocumentation();
  data.documentation.diagnosticsTechniquesObligatoires.dta.statut = 'inconnu' as never;
  data.documentation.securiteIncendie.registreSecurite.commentaire = '   ';

  const result = validatePart3ReportData(data);
  assert.equal(result.isValid, false);
  assert.deepEqual(result.issues.map(({ path, code }) => ({ path, code })), [
    {
      path: 'documentation.diagnosticsTechniquesObligatoires.dta.statut',
      code: 'statut_documentaire_invalide',
    },
    {
      path: 'documentation.securiteIncendie.registreSecurite.commentaire',
      code: 'commentaire_vide',
    },
  ]);
});

test('each DPE visual is independently optional and supplied files use the image policy', () => {
  const data = completedDocumentation();
  data.dpeCollectif.visuels.etiquette_energetique_etat_initial = visualFile('initial', 'initial.jpg', 'image/jpeg');
  assert.equal(validatePart3ReportData(data).isValid, true);

  data.dpeCollectif.visuels.etiquette_energetique_scenario_renovation_ambitieux = {
    type: 'application/pdf',
    size: PART3_DPE_VISUAL_FILE_POLICY.maxBytes + 1,
  } as unknown as globalThis.File;
  const result = validatePart3ReportData(data);
  assert.deepEqual(result.issues.map(({ path, code }) => ({ path, code })), [
    { path: 'dpeCollectif.visuels.etiquette_energetique_scenario_renovation_ambitieux', code: 'type_visuel_invalide' },
    { path: 'dpeCollectif.visuels.etiquette_energetique_scenario_renovation_ambitieux', code: 'taille_visuel_invalide' },
  ]);
});

test('the curative recap reads Part 2 eligibility without changing it and calculates one indicative amount per row', () => {
  const items = [
    item('c3', 'Curatif Niveau 3', 200, 400),
    item('maintenance', 'Entretien', 10, 20),
    item('c1', 'Curatif Niveau 1', 100, 100),
    item('c2-unknown', 'Curatif Niveau 2', 0, 0),
    item('energy', 'Travaux énergétiques', 500, 700),
  ];
  const before = JSON.stringify(items.map((entry) => entry.result));
  const summary = buildPart3CurativeSummary(items);

  assert.deepEqual(summary.lignes, [
    { numero: 1, niveau: 'Curatif Niveau 1', natureTravaux: 'Travaux c1.', montantEstimeTtcEur: 100 },
    { numero: 2, niveau: 'Curatif Niveau 2', natureTravaux: 'Travaux c2-unknown.', montantEstimeTtcEur: null },
    { numero: 3, niveau: 'Curatif Niveau 3', natureTravaux: 'Travaux c3.', montantEstimeTtcEur: 300 },
  ]);
  assert.deepEqual(summary.totauxParNiveau, {
    'Curatif Niveau 1': 100,
    'Curatif Niveau 2': null,
    'Curatif Niveau 3': 300,
  });
  assert.equal(summary.totalTtcEur, null);
  assert.equal(summary.libelleChiffrage, 'Estimation IA indicative — à vérifier par un ingénieur');
  assert.equal(JSON.stringify(items.map((entry) => entry.result)), before);
  assert.equal(deriveEstimatedCurativeAmount(100, 201), 151);
  assert.equal(deriveEstimatedCurativeAmount(0, 0), null);
  assert.equal(deriveEstimatedCurativeAmount(201, 100), null);
  assert.equal(deriveEstimatedCurativeAmount(Number.NaN, 100), null);

  const withoutCuratives = buildPart3CurativeSummary([item('maintenance-only', 'Entretien', 0, 0)]);
  assert.deepEqual(withoutCuratives.totauxParNiveau, {
    'Curatif Niveau 1': 0,
    'Curatif Niveau 2': 0,
    'Curatif Niveau 3': 0,
  });
  assert.equal(withoutCuratives.totalTtcEur, 0);
});

test('the documented deferred scope does not become a user field', () => {
  const ids: readonly string[] = DECISIONS_PARTIE3_A_CONFIRMER.map(({ id }) => id);
  assert.ok(ids.includes('donnees_scenarios_energetiques'));
  assert.ok(ids.includes('annexe_georisques'));
  assert.equal(REGLE_CHIFFRAGE_CURATIF_PARTIE3.methode, 'moyenne_arrondie_des_bornes_ttc');
  const data = createEmptyPart3ReportData() as unknown as Record<string, unknown>;
  assert.equal('scenariosEnergetiques' in data, false);
  assert.equal('annexeGeorisques' in data, false);
});
