import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import JSZip from 'jszip';
import pptxgen from 'pptxgenjs';
import type { DiagnosticNiveau, DiagnosticResult, InspectionImageItem } from '../src/types.ts';
import {
  PART3_A4,
  appendPart3Slides,
  type Part3PresentationAssets,
} from '../src/part3/part3Pptx.ts';
import { createEmptyPart3ReportData, type Part3ReportData } from '../src/part3/reportData.ts';

function dataUrl(mimeType: string, bytes: Buffer): string {
  return `data:${mimeType};base64,${bytes.toString('base64')}`;
}

function publicAsset(path: string, mimeType: string): string {
  return dataUrl(mimeType, readFileSync(new URL(path, import.meta.url)));
}

function publicPng(path: string): string {
  return publicAsset(path, 'image/png');
}

function completeDocumentation(): Part3ReportData {
  const data = createEmptyPart3ReportData();
  const tables = Object.values(data.documentation) as Array<Record<string, { statut: 'transmis' | null; commentaire: string | null }>>;
  for (const table of tables) {
    for (const row of Object.values(table)) row.statut = 'transmis';
  }
  data.documentation.documentsReglementairesAdministratifs.assuranceCopropriete.commentaire = 'Attestation reçue et archivée par le syndic.';
  return data;
}

function assets(): Part3PresentationAssets {
  return {
    logoData: publicPng('../public/france-verte-logo.png'),
    dpeVisuals: {},
    staticAssets: {
      ecoPtzData: publicAsset('../public/part3/image10.jpg', 'image/jpeg'),
    },
  };
}

function result(priority: DiagnosticNiveau, minimum: number, maximum: number, intervention: string): DiagnosticResult {
  return {
    statut_analyse: 'constat photographique indicatif',
    priorite: priority,
    famille: 'Famille de test',
    localisation: 'Parties communes',
    perimetre: 'indéterminé',
    etat_observations: 'Constat de test.',
    intervention,
    cout_estime_min_ttc_eur: minimum,
    cout_estime_max_ttc_eur: maximum,
    confiance: 'moyen',
  };
}

function diagnostic(id: string, priority: DiagnosticNiveau, minimum: number, maximum: number, intervention: string): InspectionImageItem {
  return {
    id,
    file: {} as File,
    fileName: `${id}.jpeg`,
    fileSize: 100,
    previewUrl: 'blob:test',
    status: 'completed',
    localisation: 'partie commune',
    analyzedLocalisation: 'partie commune',
    result: result(priority, minimum, maximum, intervention),
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

test('Part 3 rejects incomplete documentary data before appending a page', async () => {
  const pptx = new pptxgen();
  assert.throws(() => appendPart3Slides(pptx, createEmptyPart3ReportData(), [], assets()), /Partie 3 incomplète/);
  assert.equal((await slideXml(await packageFor(pptx))).length, 0);
});

test('Part 3 appends editable A4 pages from controlled data without reference-project examples', async () => {
  const pptx = new pptxgen();
  const report = appendPart3Slides(pptx, completeDocumentation(), [
    diagnostic('c1', 'Curatif Niveau 1', 1000, 1400, 'Sécuriser l’accès au local technique.'),
    diagnostic('c2', 'Curatif Niveau 2', 2000, 2000, 'Reprendre localement l’étanchéité.'),
    diagnostic('maintenance', 'Entretien', 100, 200, 'Ne doit pas apparaître dans le tableau curatif.'),
  ], assets(), { firstPageNumber: 22, coproprieteName: 'Résidence des Tilleuls' });

  const zip = await packageFor(pptx);
  const presentation = await zip.file('ppt/presentation.xml')!.async('string');
  assert.match(presentation, new RegExp(`<p:sldSz cx="${Math.round(PART3_A4.width * 914400)}" cy="${Math.round(PART3_A4.height * 914400)}"`));
  const slides = await slideXml(zip);
  assert.equal(slides.length, report.slides.length);
  assert.ok(slides.length >= 25, 'All reference Part 3 chapters must be present.');
  const allText = slides.join('\n');
  assert.match(allText, /3\.1 Décret thermostat/);
  assert.match(allText, /5\.1 Documents réglementaires/);
  assert.match(allText, /6\.2 Le diagnostic de performance/);
  assert.match(allText, /Tableau 1 .*récapitulatif des travaux curatifs/);
  assert.match(allText, /Sécuriser l’accès au local technique/);
  assert.match(allText, /1\s*200 €|1200/);
  assert.match(allText, /Copropriété Résidence des Tilleuls/);
  assert.match(allText, />22</);
  assert.match(allText, />Transmis</);
  assert.doesNotMatch(allText, /LE COTE SQUARE|Rive de Gier|120 € TTC|<a:t>4<\/a:t><\/a:r><\/a:p>/);
  assert.ok(report.contents.some((entry) => entry.label === '5.1 Documents réglementaires et administratifs' && entry.level === 1));
  assert.ok(report.contents.some((entry) => entry.label === '6. Synthèse du PPPT' && entry.level === 0));
  assert.deepEqual(report.curativeSummary.lignes.map(({ niveau }) => niveau), ['Curatif Niveau 1', 'Curatif Niveau 2']);
});

test('Part 3 keeps DPE captures optional and embeds each supplied capture without changing documentary requirements', async () => {
  const data = completeDocumentation();
  const dpeData = publicPng('../public/france-verte-logo.png');
  const pptxWithoutDpe = new pptxgen();
  appendPart3Slides(pptxWithoutDpe, data, [], assets());
  const withoutDpe = (await slideXml(await packageFor(pptxWithoutDpe))).join('\n');
  assert.match(withoutDpe, /État initial/);
  assert.match(withoutDpe, /Scénario de rénovation le plus ambitieux/);

  const pptxWithDpe = new pptxgen();
  appendPart3Slides(pptxWithDpe, data, [], {
    ...assets(),
    dpeVisuals: {
      etiquette_energetique_etat_initial: { data: dpeData },
      etiquette_energetique_scenario_renovation_ambitieux: { data: dpeData },
    },
  });
  const zip = await packageFor(pptxWithDpe);
  const media = Object.keys(zip.files).filter((path) => path.startsWith('ppt/media/') && !zip.files[path].dir);
  assert.ok(media.length >= 1, 'At least the supplied visual is embedded as native PPTX media.');
});

test('Part 3 paginates long curative tables with repeated headers and totals only on the final page', async () => {
  const items = Array.from({ length: 10 }, (_, index) => diagnostic(
    `c${index + 1}`,
    index % 3 === 0 ? 'Curatif Niveau 1' : index % 3 === 1 ? 'Curatif Niveau 2' : 'Curatif Niveau 3',
    1000 + index * 10,
    1400 + index * 10,
    `Travaux curatifs ${index + 1}. ${'Description détaillée nécessaire pour vérifier la pagination du tableau. '.repeat(6)}`,
  ));
  const pptx = new pptxgen();
  const report = appendPart3Slides(pptx, completeDocumentation(), items, assets());
  const slides = await slideXml(await packageFor(pptx));
  const curativeSlides = slides.filter((slide) => slide.includes('Tableau 1') && slide.includes('Nature de travaux'));
  assert.ok(curativeSlides.length >= 2, 'A long curative list must create continuation pages.');
  for (const slide of curativeSlides) assert.match(slide, /Nature de travaux/);
  assert.equal(curativeSlides.filter((slide) => slide.includes('Montant total de l’investissement des travaux curatifs')).length, 1);
  assert.equal(report.curativeSummary.lignes.length, 10);
  assert.equal(report.curativeSummary.totalTtcEur, 12450);
});

test('Part 3 continues a long optional documentary comment without clipping its table header', async () => {
  const data = completeDocumentation();
  data.documentation.documentsReglementairesAdministratifs.assuranceCopropriete.commentaire = [
    'Commentaire documentaire détaillé à préserver lors du passage sur une page suivante.',
    ...Array.from({ length: 36 }, (_, index) => `Précision ${index + 1} transmise par le syndic et à vérifier par l’ingénieur.`),
    'Fin du commentaire documentaire à conserver.',
  ].join(' ');
  const pptx = new pptxgen();
  appendPart3Slides(pptx, data, [], assets());
  const slides = await slideXml(await packageFor(pptx));
  const documentarySlides = slides.filter((slide) => slide.includes('5.1 Documents réglementaires et administratifs') && slide.includes('DESIGNATION'));
  assert.ok(documentarySlides.length >= 2, 'A lengthy optional comment must create a table continuation page.');
  for (const slide of documentarySlides) assert.match(slide, /COMMENTAIRE/);
  const allDocumentaryText = documentarySlides.join('\n');
  assert.match(allDocumentaryText, /Suite du commentaire/);
  assert.match(allDocumentaryText, /Fin du commentaire documentaire à conserver/);
});

test('Part 3 preserves the reference slide structures without repeating the lexicon header', async () => {
  const pptx = new pptxgen();
  appendPart3Slides(pptx, completeDocumentation(), [], assets());
  const slides = await slideXml(await packageFor(pptx));
  assert.equal(slides.length, 25);

  for (const page of [5, 6, 7, 9]) {
    const xml = slides[page - 1];
    assert.match(xml, /DESIGNATION/);
    assert.match(xml, /STATUT/);
    assert.match(xml, /COMMENTAIRE/);
  }
  assert.match(slides[10], /Date de réalisation du DPE collectif/);
  assert.match(slides[11], /État initial/);
  assert.match(slides[11], /Scénario 1/);
  assert.match(slides[13], /Nature de travaux/);
  assert.match(slides[16], /Conditions/);
  assert.match(slides[16], /Aide pour la copropriété/);
  assert.match(slides[16], /Primes individuelles/);
  assert.equal(slides[16].match(/✓/g)?.length, 5);
  assert.equal(slides[18].match(/8\.3 L’Éco-Prêt à Taux Zéro Copropriété/g)?.length, 1);
  assert.match(
    slides[18],
    /descr="Illustration Éco-PTZ"[\s\S]*?<a:off x="4748400" y="1879200"\/>\s*<a:ext cx="2412000" cy="1440000"\/>/,
  );
  assert.equal(slides[20].match(/✓/g)?.length, 12);
  assert.match(slides[22], /9\. LEXIQUE/);
  assert.match(slides[23], /VMC \(Ventilation Mécanique Contrôlée\)/);
  assert.match(slides[23], /Gain énergétique/);
  assert.match(slides[23], /9\. LEXIQUE/);
});
