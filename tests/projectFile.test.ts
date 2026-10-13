import assert from 'node:assert/strict';
import { File as NodeFile } from 'node:buffer';
import test from 'node:test';
import {
  createEmptyPart1ReportData,
  type Part1ReportData,
} from '../src/part1/reportData.ts';
import {
  createEmptyPart3ReportData,
  TABLEAUX_DOCUMENTAIRES_PARTIE3,
  type Part3ReportData,
} from '../src/part3/reportData.ts';
import {
  PROJECT_FILE_FORMAT,
  PROJECT_FILE_SCHEMA_VERSION,
  createProjectFileName,
  hasProjectFormData,
  parseProjectFile,
  prepareProjectImport,
  serializeProjectFile,
  type ProjectDraft,
} from '../src/project/projectFile.ts';

if (typeof globalThis.File === 'undefined') {
  Object.defineProperty(globalThis, 'File', { value: NodeFile, configurable: true });
}

function visual(contents: string, name: string, type: string): File {
  return new File([contents], name, { type });
}

function filledDraft(): ProjectDraft {
  const part1Data: Part1ReportData = {
    rapport: { dateVisite: '01/09/2026', dateRapport: '13/10/2026', version: 'Finale' },
    copropriete: { nom: 'Résidence du Parc', adresse: '12 rue des Érables\n75000 Paris' },
    donneurOrdre: { nom: 'Syndic Exemple', adresse: '4 place Centrale' },
    equipe: {
      chargeProjet: { nom: 'Alice Martin', fonction: 'Ingénieure' },
      verificateur: { nom: 'Benoît Dupont', fonction: 'Responsable' },
      intervenantSite: { nom: 'Camille Bernard' },
    },
    cadastre: { reference: 'AB 123' },
    batiment: {
      periodeConstruction: '1990–1995',
      dateReglementCopropriete: '02/01/1996',
      dateImmatriculation: '03/02/2017',
      numeroImmatriculation: 'AA123456',
      nombreBatiments: 2,
      nombreEntrees: 3,
      nombreLots: 40,
      nombreNiveaux: 5,
      nombreLotsPrincipaux: 30,
      typeChauffage: 'Collectif',
      nombreLotsHabitation: 28,
      nombreAscenseurs: 1,
      shabApproximative: 2350.5,
      altitude: -12,
    },
    patrimoine: {
      aucunPerimetreProtection: 'non_concerne',
      sitePatrimonialRemarquable: 'concerne',
      abordsMonumentHistorique: 'non_concerne',
    },
    visuels: {
      photo_principale_copropriete: visual('cover\0\u00ff', 'couverture.jpg', 'image/jpeg'),
      extrait_cadastral: visual('cadastre', 'parcelles.png', 'image/png'),
      vue_aerienne_rapprochee: visual('satellite', 'aerien.webp', 'image/webp'),
      vue_patrimoniale: visual('patrimoine', 'patrimoine.jpg', 'image/jpeg'),
    },
  };
  const part3Data: Part3ReportData = createEmptyPart3ReportData();
  for (const [tableIndex, table] of TABLEAUX_DOCUMENTAIRES_PARTIE3.entries()) {
    const rows = part3Data.documentation[table.id] as Record<string, { statut: 'transmis' | 'non_transmis' | 'non_concerne' | null; commentaire: string | null }>;
    for (const [rowIndex, row] of table.lignes.entries()) {
      rows[row.id] = {
        statut: (['transmis', 'non_transmis', 'non_concerne'] as const)[(tableIndex + rowIndex) % 3],
        commentaire: rowIndex === 0 ? `Commentaire ${table.id} — à conserver` : null,
      };
    }
  }
  part3Data.dpeCollectif.visuels.etiquette_energetique_etat_initial = visual('initial', 'initial.png', 'image/png');
  part3Data.dpeCollectif.visuels.etiquette_energetique_scenario_renovation_ambitieux = visual('renove', 'renove.webp', 'image/webp');
  return { part1Data, part3Data };
}

async function sameFiles(left: File | undefined, right: File | undefined): Promise<void> {
  assert.ok(left);
  assert.ok(right);
  assert.equal(right.name, left.name);
  assert.equal(right.type, left.type);
  assert.equal(right.size, left.size);
  assert.deepEqual(new Uint8Array(await right.arrayBuffer()), new Uint8Array(await left.arrayBuffer()));
}

test('a versioned project restores every Part 1 field, Part 3 selection, comment and visual byte exactly', async () => {
  const draft = filledDraft();
  const savedAt = new Date('2026-10-13T09:30:00.000Z');
  const json = await serializeProjectFile(draft, savedAt);
  const raw = JSON.parse(json);
  assert.deepEqual(Object.keys(raw), ['format', 'schemaVersion', 'savedAt', 'part1', 'part3']);
  assert.equal(raw.format, PROJECT_FILE_FORMAT);
  assert.equal(raw.schemaVersion, PROJECT_FILE_SCHEMA_VERSION);
  assert.equal(raw.savedAt, savedAt.toISOString());
  assert.equal(createProjectFileName(draft.part1Data, savedAt), 'PPPT_Residence_du_Parc_2026-10-13.json');

  const restored = parseProjectFile(json);
  assert.deepEqual({ ...restored.part1Data, visuels: {} }, { ...draft.part1Data, visuels: {} });
  assert.deepEqual(restored.part3Data.documentation, draft.part3Data.documentation);
  for (const role of Object.keys(draft.part1Data.visuels) as Array<keyof Part1ReportData['visuels']>) {
    await sameFiles(draft.part1Data.visuels[role], restored.part1Data.visuels[role]);
  }
  for (const role of Object.keys(draft.part3Data.dpeCollectif.visuels) as Array<keyof Part3ReportData['dpeCollectif']['visuels']>) {
    await sameFiles(draft.part3Data.dpeCollectif.visuels[role], restored.part3Data.dpeCollectif.visuels[role]);
  }
  assert.equal(hasProjectFormData(restored), true);
});

test('an incomplete draft, including an empty edited field and null dropdowns, remains restorable', async () => {
  const draft = { part1Data: createEmptyPart1ReportData(), part3Data: createEmptyPart3ReportData() };
  assert.equal(hasProjectFormData(draft), false);
  draft.part1Data.copropriete.nom = '';
  const restored = parseProjectFile(await serializeProjectFile(draft));
  assert.equal(restored.part1Data.copropriete.nom, '');
  assert.equal(restored.part1Data.rapport.version, null);
  assert.equal(restored.part3Data.documentation.documentsReglementairesAdministratifs.assuranceCopropriete.statut, null);
  assert.equal(hasProjectFormData(draft), true);
});

test('malformed JSON, wrong format and unsupported schema versions are rejected', async () => {
  assert.throws(() => parseProjectFile('{bad'), /JSON valide/);
  const raw = JSON.parse(await serializeProjectFile(filledDraft()));
  assert.throws(() => parseProjectFile(JSON.stringify({ ...raw, format: 'other' })), /projet PPPT reconnu/);
  assert.throws(() => parseProjectFile(JSON.stringify({ ...raw, schemaVersion: 2 })), /Version de projet non prise en charge/);
  assert.throws(() => parseProjectFile(JSON.stringify({ ...raw, savedAt: 'hier' })), /savedAt.*invalide/);
});

test('invalid dropdown values, field types, missing rows and unexpected data are rejected before restoration', async () => {
  const raw = JSON.parse(await serializeProjectFile(filledDraft()));
  raw.part3.documentation.diagnosticsTechniquesObligatoires.dta.statut = 'reçu';
  assert.throws(() => parseProjectFile(JSON.stringify(raw)), /statut.*valeur non autorisée/);
  raw.part3.documentation.diagnosticsTechniquesObligatoires.dta.statut = 'transmis';
  raw.part1.rapport.version = 'V1';
  assert.throws(() => parseProjectFile(JSON.stringify(raw)), /version.*valeur non autorisée/);
  raw.part1.rapport.version = 'Finale';
  raw.part1.patrimoine.aucunPerimetreProtection = 'unknown';
  assert.throws(() => parseProjectFile(JSON.stringify(raw)), /aucunPerimetreProtection.*valeur non autorisée/);
  raw.part1.patrimoine.aucunPerimetreProtection = 'non_concerne';
  raw.part1.batiment.nombreLots = '40';
  assert.throws(() => parseProjectFile(JSON.stringify(raw)), /nombreLots.*nombre fini/);
  raw.part1.batiment.nombreLots = 40;
  delete raw.part3.documentation.securiteIncendie.registreSecurite;
  assert.throws(() => parseProjectFile(JSON.stringify(raw)), /registreSecurite.*champ manquant/);
  raw.part3.documentation.securiteIncendie.registreSecurite = { statut: null, commentaire: null };
  raw.items = [{ file: 'photo.jpg' }];
  assert.throws(() => parseProjectFile(JSON.stringify(raw)), /items.*champ non reconnu/);
});

test('a corrupt visual rejects the entire import, and failure or cancellation preserves current forms', async () => {
  const current = filledDraft();
  const beforePart1 = current.part1Data;
  const beforePart3 = current.part3Data;
  const raw = JSON.parse(await serializeProjectFile(filledDraft()));
  raw.part1.visuels.extrait_cadastral.size += 1;
  let confirmations = 0;
  assert.throws(() => prepareProjectImport(JSON.stringify(raw), current, () => { confirmations += 1; return true; }), /taille ne correspond pas/);
  assert.equal(confirmations, 0);
  assert.equal(current.part1Data, beforePart1);
  assert.equal(current.part3Data, beforePart3);

  const validJson = await serializeProjectFile(filledDraft());
  assert.equal(prepareProjectImport(validJson, current, () => false), null);
  assert.equal(current.part1Data, beforePart1);
  assert.equal(current.part3Data, beforePart3);
  assert.ok(prepareProjectImport(validJson, current, () => true));
  let unexpectedConfirmation = 0;
  const empty = { part1Data: createEmptyPart1ReportData(), part3Data: createEmptyPart3ReportData() };
  assert.ok(prepareProjectImport(validJson, empty, () => { unexpectedConfirmation += 1; return false; }));
  assert.equal(unexpectedConfirmation, 0);
});

test('project files exclude diagnostic photos, temporary results and PPTX; import does not run analysis', async () => {
  const draft = filledDraft();
  const photos = [{ id: 'p2-photo', result: { intervention: 'Travaux' } }];
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = (async () => { fetchCount += 1; throw new Error('unexpected API call'); }) as typeof fetch;
  try {
    const json = await serializeProjectFile(draft);
    assert.ok(!('items' in JSON.parse(json)));
    assert.ok(!('diagnostics' in JSON.parse(json)));
    assert.ok(!('pptx' in JSON.parse(json)));
    const restored = prepareProjectImport(json, draft, () => true);
    assert.ok(restored);
    assert.equal(fetchCount, 0);
    assert.deepEqual(photos, [{ id: 'p2-photo', result: { intervention: 'Travaux' } }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
