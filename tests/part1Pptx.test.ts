import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { File as NodeFile } from 'node:buffer';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import JSZip from 'jszip';
import pptxgen from 'pptxgenjs';
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

function publicPng(path: string): string {
  return dataUrl('image/png', readFileSync(new URL(path, import.meta.url)));
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
