import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import type { DiagnosticNiveau, InspectionImageItem } from '../src/types.ts';
import { getExportableDiagnostics, renderDiagnosticPptx } from '../src/utils/pptxExport.ts';

const logoData = `data:image/png;base64,${readFileSync(new URL('../public/france-verte-logo.png', import.meta.url)).toString('base64')}`;

function photo(id: string, priority: DiagnosticNiveau, status: InspectionImageItem['status'] = 'completed'): InspectionImageItem {
  return {
    id, file: {} as File, fileName: `${id}.jpg`, fileSize: 100,
    previewUrl: 'blob:test', status,
    localisation: 'non renseignée', analyzedLocalisation: 'non renseignée',
    result: {
      statut_analyse: 'constat photographique indicatif',
      priorite: priority,
      famille: `Famille ${id}`,
      localisation: 'Parties communes',
      perimetre: 'indéterminé',
      etat_observations: `Observation ${id}.`,
      intervention: `Intervention ${id}.`,
      cout_estime_min_ttc_eur: priority.startsWith('Curatif') || priority === 'Travaux énergétiques' ? 1000 : 0,
      cout_estime_max_ttc_eur: priority.startsWith('Curatif') || priority === 'Travaux énergétiques' ? 1500 : 0,
      confiance: 'moyen',
    },
  };
}

test('PPTX selection follows the exact priority order and keeps import order within a priority', () => {
  const items = [
    photo('confirm', 'À confirmer / expertise nécessaire'),
    photo('curative-three', 'Curatif Niveau 3'),
    photo('maintenance-one', 'Entretien'),
    photo('energy', 'Travaux énergétiques'),
    photo('report', 'Signalement hors PPPT à vérifier'),
    photo('maintenance-two', 'Entretien'),
    photo('curative-one', 'Curatif Niveau 1'),
    photo('curative-two', 'Curatif Niveau 2'),
    photo('pending', 'Entretien', 'pending'),
    photo('failed', 'Entretien', 'error'),
  ];
  const outdated = photo('outdated', 'Entretien');
  outdated.localisation = 'partie commune';
  items.push(outdated);
  assert.deepEqual(getExportableDiagnostics(items).map((item) => item.id), [
    'maintenance-one', 'maintenance-two', 'report', 'curative-one',
    'curative-two', 'curative-three', 'energy', 'confirm',
  ]);
});

test('generated PPTX uses A4 portrait slides, correct fields, priority order and editable text', async () => {
  const items = [
    photo('confirm', 'À confirmer / expertise nécessaire'),
    photo('energy', 'Travaux énergétiques'),
    photo('maintenance', 'Entretien'),
    photo('curative', 'Curatif Niveau 1'),
  ];
  const output = await renderDiagnosticPptx(items, logoData,
    async () => ({ data: logoData, width: 238, height: 60 }));
  const packageFile = await JSZip.loadAsync(await output.arrayBuffer());
  const presentation = await packageFile.file('ppt/presentation.xml')!.async('string');
  assert.match(presentation, /<p:sldSz cx="7559675" cy="10691813"/);
  const slides = Object.keys(packageFile.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  assert.equal(slides.length, 4);
  const contents = await Promise.all(slides.map((path) => packageFile.file(path)!.async('string')));
  assert.match(contents[0], /ENTRETIEN/);
  const detailLineOne = 'Opérations d&apos;entretien courant et de maintenance préventive nécessaires';
  const detailLineTwo = 'au maintien en bon état des équipements et du bâtiment';
  const detailLineOneIndex = contents[0].indexOf(detailLineOne);
  const detailLineTwoIndex = contents[0].indexOf(detailLineTwo);
  assert.ok(detailLineOneIndex >= 0);
  assert.ok(detailLineTwoIndex > detailLineOneIndex);
  assert.match(contents[0].slice(detailLineOneIndex, detailLineTwoIndex), /<\/a:p><a:p>/);
  const detailShape = contents[0].slice(contents[0].lastIndexOf('<p:sp>', detailLineOneIndex), detailLineOneIndex);
  assert.match(detailShape, /<a:bodyPr[^>]*anchor="ctr"/);
  assert.match(contents[1], /CURATIF NIVEAU 1/);
  assert.match(contents[2], /TRAVAUX ÉNERGÉTIQUES/);
  assert.match(contents[3], /À CONFIRMER/);
  assert.match(contents[0], /Recommandations/);
  assert.doesNotMatch(contents[0], /Chiffrage estimatif/);
  assert.match(contents[1], /Travaux à effectuer/);
  assert.match(contents[1], /Chiffrage estimatif/);
  assert.match(contents[1], /Estimation IA indicative/);
  for (const content of contents) {
    assert.match(content, /Illustrations/);
    assert.match(content, /Copropriété ABCD XYZ/); // The autonomous export keeps its existing footer.
    assert.doesNotMatch(content, /\.jpg|Bati Chiffrage/);
    assert.match(content, /<a:t>/); // Text remains native and editable in PowerPoint.
  }
  assert.ok(Object.keys(packageFile.files).some((path) => /^ppt\/media\//.test(path)));
});

test('priority introduction appears once per priority and the table stays on later pages', async () => {
  const items = [
    photo('curative', 'Curatif Niveau 1'),
    photo('maintenance-one', 'Entretien'),
    photo('maintenance-two', 'Entretien'),
  ];
  const output = await renderDiagnosticPptx(items, logoData,
    async () => ({ data: logoData, width: 238, height: 60 }));
  const packageFile = await JSZip.loadAsync(await output.arrayBuffer());
  const contents = await Promise.all([1, 2, 3].map((number) =>
    packageFile.file(`ppt/slides/slide${number}.xml`)!.async('string')));
  assert.match(contents[0], /prst="chevron"/);
  assert.match(contents[0], /Opérations d&apos;entretien courant/);
  assert.doesNotMatch(contents[1], /prst="chevron"|Opérations d&apos;entretien courant/);
  assert.match(contents[1], /Famille maintenance-two|ENTRETIEN/);
  assert.match(contents[2], /prst="chevron"/);
  assert.match(contents[2], /Curatif Niveau 1 \(impact fort\)/);
  for (const content of contents) assert.match(content, /Illustrations/);
});

test('long diagnostic text continues onto another A4 slide without dropping the illustration', async () => {
  const item = photo('long', 'Curatif Niveau 2');
  item.result!.etat_observations = Array.from({ length: 110 }, (_, index) => `Observation ${index + 1} visible sur la photographie.`).join(' ');
  const output = await renderDiagnosticPptx([item], logoData,
    async () => ({ data: logoData, width: 238, height: 60 }));
  const packageFile = await JSZip.loadAsync(await output.arrayBuffer());
  const slides = Object.keys(packageFile.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  assert.ok(slides.length > 1);
  const contents = await Promise.all(slides.map((path) => packageFile.file(path)!.async('string')));
  assert.match(contents[0], /prst="chevron"/);
  for (const continuation of contents.slice(1)) {
    assert.doesNotMatch(continuation, /prst="chevron"|Curatif Niveau 2 \(impact modéré\)/);
    assert.match(continuation, /Famille long|CURATIF NIVEAU 2/);
  }
  assert.ok(contents.some((content) => content.includes('Observation 110')));
  assert.ok(contents.some((content) => content.includes('Illustrations')));
});
