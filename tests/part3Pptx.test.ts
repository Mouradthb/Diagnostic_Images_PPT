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

async function relationshipXml(zip: JSZip): Promise<string> {
  const paths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(path));
  return (await Promise.all(paths.map((path) => zip.file(path)!.async('string')))).join('\n');
}

function shapesWithGeometry(xml: string): Array<{ xml: string; text: string; topMm: number; bottomMm: number; heightMm: number }> {
  return [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)].flatMap(([shape]) => {
    const bounds = shape.match(/<a:off x="\d+" y="(\d+)"\/>\s*<a:ext cx="\d+" cy="(\d+)"\/>/);
    if (!bounds) return [];
    const topMm = Number(bounds[1]) / 36000;
    const heightMm = Number(bounds[2]) / 36000;
    return [{
      xml: shape,
      text: [...shape.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((match) => match[1]).join(' '),
      topMm,
      bottomMm: topMm + heightMm,
      heightMm,
    }];
  });
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

test('Part 3 keeps one normally sized curative intervention in a single table row', async () => {
  const intervention = [
    'Il convient de procéder à une vérification urgente sur site afin de s’assurer de la présence effective de l’extincteur ou de son support.',
    'Si l’absence est confirmée, il conviendra de réinstaller immédiatement un équipement de première intervention conforme aux exigences de sécurité du site.',
  ].join(' ');
  const pptx = new pptxgen();
  appendPart3Slides(pptx, completeDocumentation(), [
    diagnostic('c1', 'Curatif Niveau 1', 100, 300, intervention),
  ], assets());
  const slides = await slideXml(await packageFor(pptx));
  const curativeSlide = slides.find((slide) => slide.includes('Tableau 1') && slide.includes('présence effective'));
  assert.ok(curativeSlide, 'The curative intervention must be present in the recap table.');
  assert.equal((curativeSlide.match(/val="F6A5A8"/g) ?? []).length, 6,
    'A single curative intervention must render as one coloured table row, not continuation rows.');
});

test('Part 3 places two full curative interventions on one page and keeps totals with the last row', async () => {
  const intervention = `Il convient de procéder à une vérification urgente sur site afin de confirmer la présence et la conformité de l’équipement. ${'Prévoir ensuite sa remise en état et un contrôle de sécurité adapté aux parties communes. '.repeat(3)}`;
  const pptx = new pptxgen();
  appendPart3Slides(pptx, completeDocumentation(), [
    diagnostic('c1', 'Curatif Niveau 1', 100, 300, intervention),
    diagnostic('c2', 'Curatif Niveau 1', 200, 400, intervention),
    diagnostic('c3', 'Curatif Niveau 1', 300, 500, intervention),
  ], assets());
  const slides = await slideXml(await packageFor(pptx));
  const curativeSlides = slides.filter((slide) => slide.includes('Tableau 1') && slide.includes('Nature de travaux'));
  assert.equal(curativeSlides.length, 2);
  assert.equal((curativeSlides[0].match(/val="F6A5A8"/g) ?? []).length, 12);
  assert.equal((curativeSlides[1].match(/val="F6A5A8"/g) ?? []).length, 6);
  assert.doesNotMatch(curativeSlides[0], /Montant total de l’investissement des travaux curatifs/);
  assert.match(curativeSlides[1], /Montant total de l’investissement des travaux curatifs/);
  for (const xml of curativeSlides) {
    const tableShapes = shapesWithGeometry(xml).filter((shape) => shape.xml.includes('val="F6A5A8"') || shape.xml.includes('val="D9EAF7"'));
    assert.ok(tableShapes.every((shape) => shape.bottomMm <= 276.01), 'Curative rows and totals must clear the footer.');
  }
});

test('Part 3 keeps an exceptionally long curative intervention above the footer on continuation pages', async () => {
  const intervention = `${'Contrôler les éléments de sécurité et prévoir les travaux nécessaires. '.repeat(110)}Fin de l’intervention.`;
  const pptx = new pptxgen();
  appendPart3Slides(pptx, completeDocumentation(), [diagnostic('long', 'Curatif Niveau 1', 100, 300, intervention)], assets());
  const slides = await slideXml(await packageFor(pptx));
  const curativeSlides = slides.filter((slide) => slide.includes('Tableau 1') && slide.includes('Nature de travaux'));
  assert.ok(curativeSlides.length > 1);
  assert.match(curativeSlides.join(' '), /Fin de l’intervention/);
  for (const xml of curativeSlides) {
    const tableShapes = shapesWithGeometry(xml).filter((shape) => shape.xml.includes('val="F6A5A8"') || shape.xml.includes('val="D9EAF7"'));
    assert.ok(tableShapes.every((shape) => shape.bottomMm <= 276.01), 'No curative continuation may overlap the footer.');
  }
});

test('Part 3 keeps the complete 3.3 regulatory page inside the body area', async () => {
  const pptx = new pptxgen();
  appendPart3Slides(pptx, completeDocumentation(), [], assets());
  const slides = await slideXml(await packageFor(pptx));
  const evolution = slides.find((slide) => slide.includes('3.3 Extinction des réseaux 2G et 3G'));
  assert.ok(evolution);
  const shapes = shapesWithGeometry(evolution);
  const context = shapes.find((shape) => shape.text.includes('Les opérateurs de télécommunications'));
  const lastBullet = shapes.find((shape) => shape.text.includes('coordonner ces adaptations'));
  assert.ok(context && lastBullet);
  assert.ok(context.heightMm < 35, 'The Context text box should fit its actual six lines.');
  assert.ok(lastBullet.bottomMm <= 276.01, 'The last bullet must clear the footer.');
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

test('Part 3 embeds the requested external resource links and uses Calibri 11 for regular copy', async () => {
  const pptx = new pptxgen();
  appendPart3Slides(pptx, completeDocumentation(), [], assets());
  const zip = await packageFor(pptx);
  const relationships = await relationshipXml(zip);
  assert.match(relationships, /https:\/\/www\.service-public\.gouv\.fr\/particuliers\/vosdroits\/F35584/);
  assert.match(relationships, /https:\/\/www\.service-public\.gouv\.fr\/particuliers\/vosdroits\/F38064/);
  assert.match(relationships, /https:\/\/www\.economie\.gouv\.fr\/particuliers\/impots-et-fiscalite\/gerer-mes-autres-impots-et-taxes\/tva-taux-reduit-pour-quels-travaux/);
  assert.match(relationships, /http:\/\/www\.georisques\.gouv\.fr\//);

  const slides = await slideXml(zip);
  const ceeSlide = slides.find((slide) => slide.includes('Certificats d’économie d’énergie (CEE) | Service Public'));
  assert.match(ceeSlide ?? '', /typeface="Calibri"/);
  assert.match(ceeSlide ?? '', /sz="1100"/);
});
