import assert from 'node:assert/strict';
import { File as NodeFile } from 'node:buffer';
import test from 'node:test';
import {
  createEmptyPart1ReportData,
  DECISIONS_PARTIE1_A_CONFIRMER,
  DONNEES_DERIVEES_PARTIE1,
  ROLES_VISUELS_PARTIE1,
  type Part1ReportData,
} from '../src/part1/reportData.ts';
import {
  PART1_VISUAL_FILE_POLICY,
  PART1_REQUIRED_FIELD_PATHS,
  PART1_REQUIRED_VISUAL_ROLES,
  validatePart1ReportData,
} from '../src/part1/reportDataValidation.ts';

function visualFile(contents: string, name: string, type: string): globalThis.File {
  // Node's File lacks the browser-only webkitRelativePath member.
  return new NodeFile([contents], name, { type }) as unknown as globalThis.File;
}

function completeData(): Part1ReportData {
  return {
    rapport: {
      dateVisite: '01/06/2026',
      dateRapport: '07/08/2026',
      version: 'Initiale',
    },
    copropriete: {
      nom: 'LE COTE SQUARE',
      adresse: '18 Rue de la Barrière, Rive de Gier',
    },
    donneurOrdre: {
      nom: 'Régie l’immobilière Stéphanoise',
      adresse: '7 rue Voltaire 42100 Saint Etienne',
    },
    equipe: {
      chargeProjet: { nom: 'Anthony BELTRAN', fonction: 'Ingénieur thermicien' },
      verificateur: { nom: 'Mahmoud ATIQ', fonction: 'Responsable du pôle' },
      intervenantSite: { nom: 'Youssef BICHA' },
    },
    cadastre: { reference: 'AV 0359' },
    batiment: {
      periodeConstruction: 'Entre 2001 et 2010',
      dateReglementCopropriete: '06/03/2007',
      dateImmatriculation: '27/07/2017',
      numeroImmatriculation: 'AA7634256',
      nombreBatiments: 1,
      nombreEntrees: 1,
      nombreLots: 61,
      nombreNiveaux: 4,
      nombreLotsPrincipaux: 22,
      typeChauffage: 'Individuel',
      nombreLotsHabitation: 22,
      nombreAscenseurs: 1,
      shabApproximative: 1676.3,
      altitude: 250,
    },
    patrimoine: {
      aucunPerimetreProtection: 'concerne',
      sitePatrimonialRemarquable: 'non_concerne',
      abordsMonumentHistorique: 'non_concerne',
    },
    visuels: {
      photo_principale_copropriete: visualFile('cover', 'cover.jpg', 'image/jpeg'),
      extrait_cadastral: visualFile('cadastre', 'cadastre.png', 'image/png'),
      vue_aerienne_rapprochee: visualFile('aerial', 'aerial.webp', 'image/webp'),
      vue_patrimoniale: visualFile('heritage', 'heritage.jpg', 'image/jpeg'),
    },
  };
}

test('Part 1 data uses one source for repeated property data and keeps derived data outside the input model', () => {
  const empty = createEmptyPart1ReportData();
  assert.equal(empty.copropriete.nom, null);
  assert.equal(empty.copropriete.adresse, null);
  assert.equal(empty.equipe.chargeProjet.fonction, null);
  assert.equal(empty.equipe.verificateur.fonction, null);
  assert.deepEqual(empty.visuels, {});
  assert.ok(!('residence' in empty));
  assert.ok(!('adresseSite' in empty));
  assert.ok(DONNEES_DERIVEES_PARTIE1.includes('texteMission'));
  assert.ok(DONNEES_DERIVEES_PARTIE1.includes('nombreTotalPages'));
  assert.deepEqual(ROLES_VISUELS_PARTIE1, [
    'photo_principale_copropriete',
    'extrait_cadastral',
    'vue_aerienne_rapprochee',
    'vue_patrimoniale',
  ]);
});

test('a complete Part 1 draft with supported visuals satisfies the mandatory-data policy and is not mutated', () => {
  const data = completeData();
  const result = validatePart1ReportData(data);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.issues, []);
  assert.equal(data.copropriete.nom, 'LE COTE SQUARE');
  assert.equal(data.visuels.photo_principale_copropriete?.name, 'cover.jpg');
});

test('every user field and every Part 1 visual is mandatory by default', () => {
  const result = validatePart1ReportData(createEmptyPart1ReportData());
  assert.equal(result.isValid, false);
  assert.deepEqual(result.issues.map(({ path }) => path), [
    ...PART1_REQUIRED_FIELD_PATHS,
    ...PART1_REQUIRED_VISUAL_ROLES.map((role) => `visuels.${role}`),
  ]);
  assert.ok(PART1_REQUIRED_FIELD_PATHS.includes('equipe.chargeProjet.fonction'));
  assert.ok(PART1_REQUIRED_FIELD_PATHS.includes('equipe.verificateur.fonction'));
  assert.ok(PART1_REQUIRED_FIELD_PATHS.includes('patrimoine.abordsMonumentHistorique'));
});

test('invalid dates, text, building values and patrimonial status are rejected', () => {
  const data = completeData();
  data.rapport.dateVisite = '2026-06-01';
  data.rapport.version = 'V1' as never;
  data.batiment.dateImmatriculation = '31/02/2026';
  data.copropriete.nom = '   ';
  data.batiment.nombreLots = 2.5;
  data.batiment.nombreAscenseurs = -1;
  data.batiment.shabApproximative = Number.NaN;
  data.batiment.altitude = Number.POSITIVE_INFINITY;
  (data.patrimoine as unknown as Record<string, unknown>).sitePatrimonialRemarquable = 'unknown';

  const result = validatePart1ReportData(data);
  assert.equal(result.isValid, false);
  assert.deepEqual(result.issues.map(({ path, code }) => ({ path, code })), [
    { path: 'rapport.dateVisite', code: 'date_invalide' },
    { path: 'rapport.version', code: 'version_invalide' },
    { path: 'copropriete.nom', code: 'texte_vide' },
    { path: 'batiment.dateImmatriculation', code: 'date_invalide' },
    { path: 'batiment.nombreLots', code: 'entier_invalide' },
    { path: 'batiment.nombreAscenseurs', code: 'entier_invalide' },
    { path: 'batiment.shabApproximative', code: 'nombre_invalide' },
    { path: 'batiment.altitude', code: 'nombre_invalide' },
    { path: 'patrimoine.sitePatrimonialRemarquable', code: 'statut_patrimonial_invalide' },
  ]);
});

test('report version accepts only Initiale or Finale', () => {
  const initiale = completeData();
  initiale.rapport.version = 'Initiale';
  const finale = completeData();
  finale.rapport.version = 'Finale';

  assert.equal(validatePart1ReportData(initiale).isValid, true);
  assert.equal(validatePart1ReportData(finale).isValid, true);
});

test('visual validation applies the configured type and size policy to each known Part 1 visual role', () => {
  const data = completeData();
  data.visuels.extrait_cadastral = { type: 'application/pdf', size: 1 } as unknown as globalThis.File;
  data.visuels.vue_aerienne_rapprochee = {
    type: 'image/jpeg', size: PART1_VISUAL_FILE_POLICY.maxBytes + 1,
  } as unknown as globalThis.File;
  data.visuels.vue_patrimoniale = { type: 'image/png', size: -1 } as unknown as globalThis.File;

  const result = validatePart1ReportData(data);
  assert.equal(result.isValid, false);
  assert.deepEqual(result.issues.map(({ path, code }) => ({ path, code })), [
    { path: 'visuels.extrait_cadastral', code: 'type_visuel_invalide' },
    { path: 'visuels.vue_aerienne_rapprochee', code: 'taille_visuel_invalide' },
    { path: 'visuels.vue_patrimoniale', code: 'taille_visuel_invalide' },
  ]);
});

test('remaining open decisions do not become invented report fields', () => {
  const ids: readonly string[] = DECISIONS_PARTIE1_A_CONFIRMER.map(({ id }) => id);
  assert.ok(ids.includes('origine_des_cartes'));
  assert.ok(!ids.includes('votre_situation_patrimoniale'));
  assert.ok(!ids.includes('champs_et_visuels_obligatoires'));
  assert.ok(!ids.includes('selection_des_collaborateurs'));
  const data = createEmptyPart1ReportData() as unknown as Record<string, unknown>;
  assert.equal('votreSituation' in data, false);
});
