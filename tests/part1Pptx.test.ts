import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { File as NodeFile } from 'node:buffer';
import { readFileSync, writeFileSync } from 'node:fs';
import test from 'node:test';
import JSZip from 'jszip';
import pptxgen from 'pptxgenjs';
import type { DiagnosticNiveau, InspectionImageItem } from '../src/types.ts';
import { assemblePart1Part2Internally } from '../src/report/part1Part2Assembly.ts';
import {
  assemblePart1Part2Part3Internally,
  serializeInternalPart1Part2Part3Pptx,
} from '../src/report/part1Part2Part3Assembly.ts';
import {
  appendPart1AdministrativeSlides,
  appendPart1ContentsSlides,
  appendPart1IntroductionSlides,
  planPart1Contents,
  type Part1PresentationAssets,
} from '../src/part1/part1Pptx.ts';
import {
  createEmptyPart1ReportData,
  ROLES_VISUELS_PARTIE1,
  type Part1ReportData,
  type RoleVisuelPartie1,
} from '../src/part1/reportData.ts';
import {
  type Part3PresentationAssets,
} from '../src/part3/part3Pptx.ts';
import { createEmptyPart3ReportData, type Part3ReportData } from '../src/part3/reportData.ts';

const REFERENCE = new URL('../docs/PPPT PART1+PART2 .pptx', import.meta.url);
const VISUAL_FIXTURES = [
  'ppt/media/image10.JPEG',
  'ppt/media/image18.JPEG',
  'ppt/media/image19.JPEG',
  'ppt/media/image20.JPEG',
] as const;

function dataUrl(mimeType: string, bytes: Buffer): string {
  return `data:${mimeType};base64,${bytes.toString('base64')}`;
}

function publicAsset(path: string, mimeType: string): string {
  return dataUrl(mimeType, readFileSync(new URL(path, import.meta.url)));
}

function publicPng(path: string): string {
  return publicAsset(path, 'image/png');
}

function fileFromBytes(bytes: Buffer, role: RoleVisuelPartie1): File {
  // Node's File does not expose the browser-only webkitRelativePath property.
  return new NodeFile([bytes], `${role}.jpeg`, { type: 'image/jpeg' }) as unknown as File;
}

async function completeFixture(): Promise<{
  data: Part1ReportData;
  assets: Part1PresentationAssets;
  visualBytes: Buffer[];
}> {
  const reference = await JSZip.loadAsync(readFileSync(REFERENCE));
  const visualBytes = await Promise.all(VISUAL_FIXTURES.map(async (path) => {
    const entry = reference.file(path);
    assert.ok(entry, `Missing test visual in the committed reference: ${path}`);
    return entry.async('nodebuffer');
  }));
  const data = createEmptyPart1ReportData();
  data.rapport = { dateVisite: '05/09/2026', dateRapport: '12/09/2026', version: 'Finale' };
  data.copropriete = { nom: 'Résidence des Tilleuls', adresse: '24 avenue des Érables, 69003 Lyon' };
  data.donneurOrdre = { nom: 'Syndic Équilibre', adresse: '8 place de la République, 69002 Lyon' };
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
  const visuals = {} as Part1PresentationAssets['visuals'];
  for (let index = 0; index < ROLES_VISUELS_PARTIE1.length; index += 1) {
    const role = ROLES_VISUELS_PARTIE1[index];
    const bytes = visualBytes[index];
    data.visuels[role] = fileFromBytes(bytes, role);
    visuals[role] = { data: dataUrl('image/jpeg', bytes), width: 800, height: 600 };
  }
  const assets: Part1PresentationAssets = {
    logoData: publicPng('../public/france-verte-logo.png'),
    coverBlueCornerData: publicPng('../public/part1/cover-blue-corner.png'),
    coverYellowCornerData: publicPng('../public/part1/cover-yellow-corner.png'),
    rgeLogoData: publicPng('../public/part1/rge-opqibi.png'),
    stampData: publicPng('../public/part1/france-verte-stamp.png'),
    visuals,
  };
  return { data, assets, visualBytes };
}

function completePart3Data(): Part3ReportData {
  const data = createEmptyPart3ReportData();
  const tables = Object.values(data.documentation) as Array<Record<string, { statut: 'transmis' | null; commentaire: string | null }>>;
  for (const table of tables) {
    for (const row of Object.values(table)) row.statut = 'transmis';
  }
  return data;
}

function part3Assets(): Part3PresentationAssets {
  return {
    logoData: publicPng('../public/france-verte-logo.png'),
    dpeVisuals: {
      etiquette_energetique_etat_initial: { data: publicPng('../public/part3/image3.png') },
      etiquette_energetique_scenario_renovation_ambitieux: { data: publicPng('../public/part3/image4.png') },
    },
    staticAssets: {
      defibrillatorData: publicPng('../public/part3/image2.png'),
      dpeClassDData: publicPng('../public/part3/image3.png'),
      dpeClassEData: publicPng('../public/part3/image4.png'),
      dpeClassFData: publicPng('../public/part3/image5.png'),
      dpeClassGData: publicPng('../public/part3/image6.png'),
      maPrimeRenovLogoData: publicPng('../public/part3/image7.png'),
      maPrimeRenovTableData: publicPng('../public/part3/image8.png'),
      ceeLogoData: publicPng('../public/part3/image9.png'),
      ecoPtzData: publicAsset('../public/part3/image10.jpg', 'image/jpeg'),
      tvaData: publicAsset('../public/part3/image11.jpeg', 'image/jpeg'),
    },
  };
}

async function packageFor(pptx: pptxgen): Promise<JSZip> {
  const output = await pptx.write({ outputType: 'nodebuffer' });
  return JSZip.loadAsync(output);
}

async function slideXml(zip: JSZip): Promise<string[]> {
  const paths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((left, right) => Number(left.match(/\d+/)![0]) - Number(right.match(/\d+/)![0]));
  return Promise.all(paths.map((path) => zip.file(path)!.async('string')));
}

async function assertContentTypeOverridesTargetExistingParts(zip: JSZip): Promise<void> {
  const contentTypes = await zip.file('[Content_Types].xml')!.async('string');
  const partNames = Array.from(contentTypes.matchAll(/<Override\b[^>]*\bPartName="([^"]+)"[^>]*\/>/g))
    .map(([, partName]) => partName.replace(/^\//, ''));
  for (const partName of partNames) {
    assert.ok(zip.file(partName), `L’override Open XML référence une partie absente : ${partName}`);
  }
}

test('Part 1 rejects incomplete data before appending any slide', async () => {
  const { assets } = await completeFixture();
  const pptx = new pptxgen();
  assert.throws(() => appendPart1AdministrativeSlides(pptx, createEmptyPart1ReportData(), assets));
  const slides = await slideXml(await packageFor(pptx));
  assert.equal(slides.length, 0);
});

test('Part 1 appends four editable A4 pages populated from this project', async () => {
  const { data, assets } = await completeFixture();
  const pptx = new pptxgen();
  const appended = appendPart1AdministrativeSlides(pptx, data, assets);
  assert.equal(appended.slides.length, 4);
  appended.finalize({ totalPages: 37, firstPageNumber: 11 });

  const zip = await packageFor(pptx);
  const presentation = await zip.file('ppt/presentation.xml')!.async('string');
  assert.match(presentation, /<p:sldSz cx="7559675" cy="10691813"/);
  const slides = await slideXml(zip);
  assert.equal(slides.length, 4);
  for (const slide of slides) assert.match(slide, /<a:t>[^<]+<\/a:t>/);

  assert.match(slides[0], /Résidence des Tilleuls/);
  assert.match(slides[0], /24 avenue des Érables/);
  assert.match(slides[0], /05\/09\/2026/);
  assert.match(slides[0], /12\/09\/2026/);
  assert.match(slides[0], /Finale/);

  assert.match(slides[1], /Syndic Équilibre/);
  assert.match(slides[1], /Camille Martin/);
  assert.match(slides[1], /Alex Durand/);
  assert.match(slides[1], /Nora Petit/);
  assert.match(slides[1], /AZ 0421/);

  assert.match(slides[2], /Résidence des Tilleuls/);
  assert.match(slides[2], /BB9876543/);
  assert.match(slides[2], /Collectif gaz/);
  assert.match(slides[2], /Entre 1980 et 1990/);

  assert.match(slides[3], /Aucun périmètre de protection/);
  assert.match(slides[3], /Site patrimonial remarquable/);
  assert.match(slides[3], /Abords/);
  assert.match(slides[3], /monument historique/);
  assert.match(slides[3], /Concerné/);
  assert.match(slides[3], /Non concerné/);

  const allText = slides.join('\n');
  assert.doesNotMatch(allText, /LE COTE SQUARE|Rive de Gier|Géoportail|Geoportail/);
});

test('the four user supplied visuals are embedded in the resulting PPTX', async () => {
  const { data, assets, visualBytes } = await completeFixture();
  const pptx = new pptxgen();
  appendPart1AdministrativeSlides(pptx, data, assets).finalize({ totalPages: 4, firstPageNumber: 1 });
  const zip = await packageFor(pptx);
  const media = await Promise.all(Object.keys(zip.files)
    .filter((path) => path.startsWith('ppt/media/') && !zip.files[path].dir)
    .map(async (path) => ({ path, bytes: await zip.file(path)!.async('nodebuffer') })));
  const mediaByHash = new Map(media.map(({ path, bytes }) => [
    createHash('sha256').update(bytes).digest('hex'), path,
  ]));
  for (let index = 0; index < visualBytes.length; index += 1) {
    const bytes = visualBytes[index];
    const expectedHash = createHash('sha256').update(bytes).digest('hex');
    const mediaPath = mediaByHash.get(expectedHash);
    assert.ok(mediaPath, 'One of the four supplied visuals is absent from the PPTX');
    const slideRelations = await zip.file(`ppt/slides/_rels/slide${index + 1}.xml.rels`)!.async('string');
    assert.ok(slideRelations.includes(mediaPath.split('/').at(-1)!),
      `The visual for page ${index + 1} is not linked from that slide`);
  }
});

test('Part 1 contents list its subtitles and retain only supplied later-section entries', async () => {
  const { data, assets } = await completeFixture();
  const pptx = new pptxgen();
  const administrative = appendPart1AdministrativeSlides(pptx, data, assets);
  const plan = planPart1Contents(5, [
    { label: '2. Identification et hiérarchisation des travaux et observations', page: 9, level: 0 },
    { label: '2.1 Rubrique Entretien', page: 9, level: 1 },
    { label: '2.2 Rubrique Signalement', page: 10, level: 1 },
  ]);
  assert.equal(plan.pageCount, 1);
  assert.equal(plan.firstIntroductionPage, 6);
  assert.deepEqual(plan.entries.slice(0, 7), [
    { label: 'Informations administratives', page: 2, level: 0 },
    { label: '1. Introduction', page: 6, level: 0 },
    { label: '1.1 Cadre réglementaire du Projet de Plan Pluriannuel de Travaux (PPPT)', page: 6, level: 1 },
    { label: '1.2 Validité du présent rapport', page: 7, level: 1 },
    { label: '1.3 Périmètre de la mission et réserves', page: 7, level: 1 },
    { label: '1.4 Limite de la mission', page: 8, level: 1 },
    { label: '1.5 Hiérarchisation des travaux et des observations', page: 8, level: 1 },
  ]);
  const contents = appendPart1ContentsSlides(pptx, data, assets.logoData, plan.entries, 5);
  assert.equal(contents.length, 1);
  const introduction = appendPart1IntroductionSlides(pptx, data, assets.logoData, plan.firstIntroductionPage);
  assert.equal(introduction.length, 3);
  administrative.finalize({ totalPages: 12, firstPageNumber: 1 });

  const slides = await slideXml(await packageFor(pptx));
  assert.equal(slides.length, 8);
  assert.match(slides[4], /SOMMAIRE/);
  assert.match(slides[4], /Informations administratives/);
  assert.match(slides[4], /1\.1 Cadre réglementaire/);
  assert.match(slides[4], /1\.2 Validité du présent rapport/);
  assert.match(slides[4], /1\.3 Périmètre de la mission et réserves/);
  assert.match(slides[4], /1\.4 Limite de la mission/);
  assert.match(slides[4], /1\.5 Hiérarchisation des travaux et des observations/);
  assert.match(slides[4], /Identification et hiérarchisation/);
  assert.match(slides[4], /2\.1 Rubrique Entretien/);
  assert.match(slides[4], /2\.2 Rubrique Signalement/);
  assert.doesNotMatch(slides[4], /Financements|Annexe|Évolutions réglementaires/);
  assert.match(slides[5], /1\.1 Cadre réglementaire/);
  assert.match(slides[5], /loi n° 2021-1104 du 22 août 2021/);
  assert.match(slides[5], /L\.731-1 à L\.731-5/);
  assert.match(slides[5], /arrêté du 30 mars 2022/);
  assert.match(slides[6], /documents et informations transmis par le syndicat/);
  assert.match(slides[6], /Éléments non visités ou non accessibles/);
  assert.doesNotMatch(slides[6], /photographies importées/);
  for (const priority of ['Entretien', 'Signalement', 'Curatif', 'Travaux énergétiques']) {
    assert.ok(slides[7].includes(priority), `La table des priorités manque ${priority}`);
  }
  assert.match(slides[7], /Travaux d.esthétiques/);
  assert.match(slides[7], /Travaux prioritaires/);
  assert.doesNotMatch(slides[7], /À confirmer/);
  assert.match(slides[7], /Résidence des Tilleuls/);
  assert.doesNotMatch(slides.join('\n'), /LE COTE SQUARE|Rive de Gier/);
});

test('Part 1 introduction keeps the reference typography and flowing scope layout', async () => {
  const { data, assets } = await completeFixture();
  const pptx = new pptxgen();
  appendPart1IntroductionSlides(pptx, data, assets.logoData, 6);

  const slides = await slideXml(await packageFor(pptx));
  const scope = slides[1];
  assert.match(scope, /<a:bodyPr[^>]*anchor="t"[^>]*><a:spAutoFit\/><\/a:bodyPr>/);
  assert.doesNotMatch(scope, /<a:bodyPr[^>]*anchor="t"[^>]*><a:normAutofit\/>/);
  assert.match(scope, /<a:pPr[^>]*algn="just"/);
  assert.match(scope, /sz="1300" b="1"/);
  assert.match(scope, /sz="1100"/);
  assert.match(scope, /u="sng"/);
  assert.match(scope, /<a:buChar char="&#x2022;"\/>/);
  assert.match(scope, /marL="150368" indent="-150368"/);

  const priorities = slides[2];
  assert.match(priorities, /<a:off x="541080" y="1203480"/);
  assert.match(priorities, /<a:off x="541080" y="4195080"/);
  assert.match(priorities, /sz="1140" b="1"[\s\S]*?<a:t>Entretien<\/a:t>/);
});

test('Part 1 contents recalculate introduction pages when later entries require a second contents page', () => {
  const plan = planPart1Contents(5, Array.from({ length: 14 }, (_, index) => ({
    label: `2.${index + 1} Rubrique produite`,
    page: 10 + index,
    level: 1 as const,
  })));
  assert.equal(plan.pageCount, 2);
  assert.equal(plan.firstIntroductionPage, 7);
  assert.deepEqual(plan.entries.slice(1, 7).map(({ label, page }) => ({ label, page })), [
    { label: '1. Introduction', page: 7 },
    { label: '1.1 Cadre réglementaire du Projet de Plan Pluriannuel de Travaux (PPPT)', page: 7 },
    { label: '1.2 Validité du présent rapport', page: 8 },
    { label: '1.3 Périmètre de la mission et réserves', page: 8 },
    { label: '1.4 Limite de la mission', page: 9 },
    { label: '1.5 Hiérarchisation des travaux et des observations', page: 9 },
  ]);
});

test('Part 1 contents add a second page only when entries exceed available rows', async () => {
  const { data, assets } = await completeFixture();
  const pptx = new pptxgen();
  const contents = appendPart1ContentsSlides(pptx, data, assets.logoData,
    Array.from({ length: 21 }, (_, index) => ({
      label: `Rubrique ${index + 1}`,
      page: index + 2,
      level: 0 as const,
    })), 5);
  assert.equal(contents.length, 2);
  const slides = await slideXml(await packageFor(pptx));
  assert.equal(slides.length, 2);
  assert.match(slides[0], /Rubrique 20/);
  assert.doesNotMatch(slides[0], /Rubrique 21/);
  assert.match(slides[1], /Rubrique 21/);
  assert.doesNotMatch(slides[1], /Rubrique 20/);
  assert.throws(() => appendPart1ContentsSlides(pptx, data, assets.logoData, [], 5));
});

function diagnostic(id: string, priority: DiagnosticNiveau, observation = `Observation ${id}.`): InspectionImageItem {
  return {
    id, file: {} as File, fileName: `${id}.jpeg`, fileSize: 100,
    previewUrl: 'blob:test', status: 'completed',
    localisation: 'non renseignée', analyzedLocalisation: 'non renseignée',
    result: {
      statut_analyse: 'constat photographique indicatif', priorite: priority,
      famille: `Famille ${id}`, localisation: 'Parties communes', perimetre: 'indéterminé',
      etat_observations: observation, intervention: `Intervention ${id}.`,
      cout_estime_min_ttc_eur: priority.startsWith('Curatif') ? 1000 : 0,
      cout_estime_max_ttc_eur: priority.startsWith('Curatif') ? 1500 : 0,
      confiance: 'moyen',
    },
  };
}

test('internal Part 1 + Part 2 assembly uses real category starts and global pagination', async () => {
  const { data, assets } = await completeFixture();
  const longObservation = Array.from({ length: 110 }, (_, index) =>
    `Observation ${index + 1} visible sur la photographie.`).join(' ');
  const items = [
    diagnostic('confirm', 'À confirmer / expertise nécessaire'),
    diagnostic('curative', 'Curatif Niveau 1', longObservation),
    diagnostic('maintenance-one', 'Entretien'),
    diagnostic('maintenance-two', 'Entretien'),
    diagnostic('ignored', 'Travaux énergétiques'),
  ];
  items[4].status = 'pending';
  const report = await assemblePart1Part2Internally(data, assets, items,
    async () => ({ data: assets.logoData, width: 238, height: 60 }));
  if (process.env.PPPT_INTERNAL_PREVIEW_PATH) {
    const preview = await report.presentation.write({ outputType: 'nodebuffer' });
    if (!Buffer.isBuffer(preview)) throw new Error('Le PPTX d’essai n’est pas un Buffer.');
    writeFileSync(process.env.PPPT_INTERNAL_PREVIEW_PATH, preview);
  }
  const zip = await packageFor(report.presentation);
  const slides = await slideXml(zip);
  assert.equal(slides.length, report.totalPages);
  assert.match((await zip.file('ppt/presentation.xml')!.async('string')),
    /<p:sldSz cx="7559675" cy="10691813"/);
  assert.match(slides[0], new RegExp(`Ce rapport contient : ${report.totalPages} pages`));
  assert.match(slides[4], /SOMMAIRE/);
  assert.match(slides[4], /1\.1 Cadre réglementaire/);
  assert.match(slides[4], /2\.1 Entretien/);
  assert.match(slides[4], /2\.2 Curatif Niveau 1/);
  assert.match(slides[4], /2\.3 À confirmer/);
  assert.doesNotMatch(slides[4], /2\.4|Travaux énergétiques/);
  assert.match(slides[5], /1\.1 Cadre réglementaire/);
  assert.match(slides[7], /1\.5 Hiérarchisation/);

  assert.deepEqual(report.priorityStarts.map(({ priority }) => priority), [
    'Entretien', 'Curatif Niveau 1', 'À confirmer / expertise nécessaire',
  ]);
  assert.equal(report.priorityStarts[0].page, 9);
  assert.equal(report.priorityStarts[1].page, 11);
  assert.ok(report.priorityStarts[2].page > 12);
  assert.deepEqual(report.contents.filter((entry) => entry.label.startsWith('2.'))
    .map(({ page }) => page), [9, 9, 11, report.priorityStarts[2].page]);
  assert.match(slides[8], /Famille maintenance-one|ENTRETIEN/);
  assert.match(slides[9], /Famille maintenance-two|ENTRETIEN/);
  assert.doesNotMatch(slides[9], /prst="chevron"/);
  assert.match(slides[10], /Famille curative|CURATIF NIVEAU 1/);
  assert.match(slides[10], /prst="chevron"/);
  assert.match(slides[report.priorityStarts[2].page - 1], /À CONFIRMER/);
  for (let index = 8; index < slides.length; index += 1) {
    assert.match(slides[index], /Copropriété Résidence des Tilleuls/);
    assert.doesNotMatch(slides[index], /Copropriété ABCD XYZ/);
  }
  assert.ok(slides.some((slide) => slide.includes('Observation 110')));
  assert.equal(slides.filter((slide) => slide.includes('Illustrations')).length, 4);
});

test('internal Part 1 + Part 2 + Part 3 assembly keeps a single contents and global pagination', async () => {
  const { data, assets, visualBytes } = await completeFixture();
  const diagnosticPhoto = dataUrl('image/jpeg', visualBytes[0]);
  const part3Data = completePart3Data();
  part3Data.documentation.documentsReglementairesAdministratifs.assuranceCopropriete.commentaire = [
    'Commentaire documentaire long à conserver lors de l’assemblage du rapport complet.',
    ...Array.from({ length: 36 }, (_, index) => `Précision ${index + 1} transmise par le syndic et à vérifier par l’ingénieur.`),
    'Fin du commentaire documentaire à conserver.',
  ].join(' ');
  const longObservation = Array.from({ length: 110 }, (_, index) =>
    `Observation ${index + 1} visible sur la photographie.`).join(' ');
  const items = [
    diagnostic('confirm', 'À confirmer / expertise nécessaire'),
    diagnostic('maintenance', 'Entretien'),
    diagnostic('signalement', 'Signalement hors PPPT à vérifier'),
    diagnostic('curative-1', 'Curatif Niveau 1', longObservation),
    diagnostic('curative-2', 'Curatif Niveau 2'),
    diagnostic('curative-3', 'Curatif Niveau 3'),
    diagnostic('energetic', 'Travaux énergétiques'),
  ];
  const prioritiesBefore = items.map((item) => item.result?.priorite);

  const report = await assemblePart1Part2Part3Internally(
    data,
    assets,
    part3Data,
    part3Assets(),
    items,
    async () => ({ data: diagnosticPhoto, width: 800, height: 600 }),
  );
  if (process.env.PPPT_INTERNAL_COMBINED_PREVIEW_PATH) {
    const preview = await serializeInternalPart1Part2Part3Pptx(report);
    writeFileSync(process.env.PPPT_INTERNAL_COMBINED_PREVIEW_PATH, Buffer.from(await preview.arrayBuffer()));
  }
  const serialized = await serializeInternalPart1Part2Part3Pptx(report);
  const zip = await JSZip.loadAsync(await serialized.arrayBuffer());
  await assertContentTypeOverridesTargetExistingParts(zip);
  const slides = await slideXml(zip);
  const contentsSlides = slides.slice(4, report.priorityStarts[0].page - 4);
  const contentsText = contentsSlides.join('\n');

  assert.equal(slides.length, report.totalPages);
  assert.match((await zip.file('ppt/presentation.xml')!.async('string')),
    /<p:sldSz cx="7559675" cy="10691813"/);
  assert.match(slides[0], new RegExp(`Ce rapport contient : ${report.totalPages} pages`));
  assert.ok(contentsSlides.length >= 3, 'The combined contents must reserve every required page.');
  // A long Part 3 outline requires several contents pages. Each reserved page
  // must retain the common Part 1 banner and the global footer, rather than
  // being an unbranded continuation page.
  contentsSlides.forEach((slide, index) => {
    assert.match(slide, /SOMMAIRE/, `Le bandeau du sommaire manque à la page ${index + 1}.`);
    assert.match(slide, /Copropriété Résidence des Tilleuls/,
      `Le pied de page manque à la page ${index + 1} du sommaire.`);
  });
  assert.match(contentsText, /1\.1 Cadre réglementaire/);
  assert.match(contentsText, /2\.1 Entretien/);
  assert.match(contentsText, /2\.2 Signalement/);
  assert.match(contentsText, /2\.3 Curatif Niveau 1/);
  assert.match(contentsText, /2\.4 Curatif Niveau 2/);
  assert.match(contentsText, /2\.5 Curatif Niveau 3/);
  assert.match(contentsText, /2\.6 Travaux énergétiques/);
  assert.match(contentsText, /2\.7 À confirmer/);
  assert.match(contentsText, /3\. Évolutions réglementaires et normatives/);
  assert.match(contentsText, /5\.1 Documents réglementaires et administratifs/);
  assert.match(contentsText, /6\.2 Le diagnostic de performance énergétiques/);
  assert.match(contentsText, /11\. Annexe/);

  assert.deepEqual(report.priorityStarts.map(({ priority }) => priority), [
    'Entretien',
    'Signalement hors PPPT à vérifier',
    'Curatif Niveau 1',
    'Curatif Niveau 2',
    'Curatif Niveau 3',
    'Travaux énergétiques',
    'À confirmer / expertise nécessaire',
  ]);
  assert.equal(report.part3Contents[0].label, '3. Évolutions réglementaires et normatives');
  assert.equal(report.part3Contents[0].page, report.part3FirstPage);
  assert.equal(report.contents.find((entry) => entry.label === report.part3Contents[0].label)?.page,
    report.part3FirstPage);
  assert.match(slides[report.part3FirstPage - 1], /3\.1 Décret thermostat/);
  assert.match(slides[report.part3FirstPage - 2], /Copropriété Résidence des Tilleuls/);
  assert.match(slides[report.part3FirstPage - 1], /Copropriété Résidence des Tilleuls/);
  assert.doesNotMatch(slides.join('\n'), /Copropriété Copropriété|Copropriété ABCD XYZ|LE COTE SQUARE/);

  const section51 = report.part3Contents.find((entry) => entry.label === '5.1 Documents réglementaires et administratifs');
  const section52 = report.part3Contents.find((entry) => entry.label === '5.2 Diagnostics techniques obligatoires');
  assert.ok(section51 && section52);
  assert.ok(section52.page > section51.page + 1, 'A long documentary comment must shift the later Part 3 page.');
  assert.match(slides[section52.page - 1], /5\.2 Diagnostics techniques obligatoires/);
  assert.ok(slides.some((slide) => slide.includes('Observation 110')));
  assert.match(slides.join('\n'), /Étiquette DPE — État initial/);
  assert.match(slides.join('\n'), /Étiquette DPE — Scénario de rénovation le plus ambitieux/);
  assert.deepEqual(items.map((item) => item.result?.priorite), prioritiesBefore);
});

test('internal assembly rejects missing Part 1 data and no eligible diagnostics', async () => {
  const { data, assets } = await completeFixture();
  const loadPhoto = async () => ({ data: assets.logoData, width: 238, height: 60 });
  await assert.rejects(assemblePart1Part2Internally(createEmptyPart1ReportData(), assets,
    [diagnostic('maintenance', 'Entretien')], loadPhoto), /Partie 1 incomplète/);
  await assert.rejects(assemblePart1Part2Internally(data, assets, [], loadPhoto),
    /Aucun diagnostic terminé/);
});

test('internal Part 1 + Part 2 + Part 3 assembly rejects missing Part 3 data before rendering Part 2', async () => {
  const { data, assets } = await completeFixture();
  let photoWasRequested = false;
  await assert.rejects(assemblePart1Part2Part3Internally(
    data,
    assets,
    createEmptyPart3ReportData(),
    part3Assets(),
    [diagnostic('maintenance', 'Entretien')],
    async () => {
      photoWasRequested = true;
      return { data: assets.logoData, width: 238, height: 60 };
    },
  ), /Partie 3 incomplète/);
  assert.equal(photoWasRequested, false);
});
