import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DiagnosticNiveau, DiagnosticResult, InspectionImageItem } from '../src/types.ts';
import { ResultCard } from '../src/components/ResultCard.tsx';
import { countPriorityResults, filterDisplayedResults } from '../src/utils/resultFilter.ts';

const result = (priorite: DiagnosticNiveau): DiagnosticResult => ({
  statut_analyse: 'constat photographique indicatif',
  priorite,
  famille: 'Façades extérieures',
  localisation: 'Localisation à confirmer',
  perimetre: 'indéterminé',
  etat_observations: 'Constat de test.',
  intervention: 'Action de test.',
  cout_estime_min_ttc_eur: 0,
  cout_estime_max_ttc_eur: 0,
  confiance: 'faible',
});

function item(
  id: string,
  status: InspectionImageItem['status'],
  priorite?: DiagnosticNiveau,
): InspectionImageItem {
  return {
    id,
    file: {} as File,
    previewUrl: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
    fileName: `${id}.jpg`,
    fileSize: 1,
    status,
    ...(priorite ? { result: result(priorite) } : {}),
  };
}

test('a legend priority shows only matching completed diagnostics while keeping operational cards visible', () => {
  const items = [
    item('priority-one', 'completed', 'Curatif Niveau 1'),
    item('maintenance', 'completed', 'Entretien'),
    item('report', 'completed', 'Signalement hors PPPT à vérifier'),
    item('failed', 'error'),
    item('working', 'analyzing'),
    item('waiting', 'pending'),
  ];

  assert.deepEqual(
    filterDisplayedResults(items, 'Curatif Niveau 1').map((entry) => entry.id),
    ['priority-one', 'failed', 'working'],
  );
  assert.deepEqual(
    filterDisplayedResults(items, 'Signalement hors PPPT à vérifier').map((entry) => entry.id),
    ['report', 'failed', 'working'],
  );
  assert.equal(countPriorityResults(items, 'Curatif Niveau 1'), 1);
  assert.equal(countPriorityResults(items, 'Entretien'), 1);
});

test('clearing the legend selection restores every non-pending card', () => {
  const items = [
    item('priority-one', 'completed', 'Curatif Niveau 1'),
    item('maintenance', 'completed', 'Entretien'),
    item('failed', 'error'),
    item('working', 'analyzing'),
    item('waiting', 'pending'),
  ];

  assert.deepEqual(
    filterDisplayedResults(items, null).map((entry) => entry.id),
    ['priority-one', 'maintenance', 'failed', 'working'],
  );
});

test('every report priority keeps its own label and colour in the table header', () => {
  const styles: [DiagnosticNiveau, string, string][] = [
    ['Curatif Niveau 1', 'CURATIF NIVEAU 1', 'bg-red-600'],
    ['Curatif Niveau 2', 'CURATIF NIVEAU 2', 'bg-orange-500'],
    ['Curatif Niveau 3', 'CURATIF NIVEAU 3', 'bg-emerald-600'],
    ['Entretien', 'ENTRETIEN', 'bg-teal-600'],
    ['Signalement hors PPPT à vérifier', 'SIGNALEMENT À VÉRIFIER', 'bg-blue-600'],
    ['Travaux énergétiques', 'TRAVAUX ÉNERGÉTIQUES', 'bg-green-950'],
    ['À confirmer / expertise nécessaire', 'À CONFIRMER', 'fv-result-table-priority--confirm'],
  ];
  for (const [priority, label, className] of styles) {
    const html = renderToStaticMarkup(createElement(ResultCard, {
      item: item('photo', 'completed', priority), displayNumber: 3,
    }));
    assert.ok(html.includes(label));
    assert.ok(html.includes(className));
    assert.ok(html.includes('Fiche de diagnostic numéro 3'));
    assert.ok(html.includes('Illustrations'));
  }
});

test('completed report headers show only the family and priority', () => {
  const completed = item('IMG_2909', 'completed', 'Entretien');
  completed.analyzedAt = '13:15:34';
  const html = renderToStaticMarkup(createElement(ResultCard, {
    item: completed, displayNumber: 1,
  }));
  assert.ok(html.includes('Façades extérieures'));
  assert.ok(html.includes('ENTRETIEN'));
  assert.ok(!html.includes('fv-result-table-file'));
  assert.ok(!html.includes('Pré-analyse indicative'));
  assert.ok(!html.includes('Confiance :'));
  assert.ok(!html.includes('Périmètre :'));
  assert.ok(!html.includes('Analysée :'));
  assert.ok(!html.includes('13:15:34'));
});

test('cost row shows an indicative AI range without a false BatiChiffrage attribution', () => {
  const energyItem = item('energy', 'completed', 'Travaux énergétiques');
  energyItem.result = {
    ...energyItem.result!,
    cout_estime_min_ttc_eur: 1000,
    cout_estime_max_ttc_eur: 1500,
  };
  const html = renderToStaticMarkup(createElement(ResultCard, { item: energyItem, displayNumber: 1 }));
  assert.ok(html.includes('Localisation'));
  assert.ok(html.includes('Travaux à effectuer'));
  assert.ok(html.includes('Chiffrage estimatif'));
  assert.ok(html.includes('1 000 à 1 500 € TTC'));
  assert.ok(html.includes('Estimation IA'));
  assert.ok(!html.includes('Bati Chiffrage'));
  assert.ok(html.includes('Illustrations'));
  assert.ok(!html.includes('Remarque technique'));
  const maintenance = renderToStaticMarkup(createElement(ResultCard, {
    item: item('maintenance', 'completed', 'Entretien'), displayNumber: 2,
  }));
  assert.ok(maintenance.includes('Recommandations'));
  assert.ok(maintenance.includes('Illustrations'));
  assert.ok(!maintenance.includes('Chiffrage estimatif'));
  assert.ok(!maintenance.includes('Remarque technique'));
  const signalement = renderToStaticMarkup(createElement(ResultCard, {
    item: item('signalement', 'completed', 'Signalement hors PPPT à vérifier'), displayNumber: 3,
  }));
  assert.ok(signalement.includes('Recommandations'));
  assert.ok(signalement.includes('Illustrations'));
  assert.ok(!signalement.includes('Chiffrage estimatif'));
  const uncertain = renderToStaticMarkup(createElement(ResultCard, {
    item: item('uncertain', 'completed', 'À confirmer / expertise nécessaire'), displayNumber: 4,
  }));
  assert.ok(uncertain.includes('Travaux à effectuer'));
  assert.ok(uncertain.includes('Coût estimé'));
  assert.ok(uncertain.includes('À déterminer après visite'));
  assert.ok(uncertain.includes('Illustrations'));
  assert.ok(!uncertain.includes('Estimation IA —'));
});

test('a failed refresh still shows the retained report and its retry action', () => {
  const failed = item('failed-refresh', 'error', 'Curatif Niveau 1');
  failed.errorMessage = 'Échec temporaire';
  const html = renderToStaticMarkup(createElement(ResultCard, {
    item: failed, displayNumber: 1, onRetry: () => undefined,
  }));
  assert.ok(html.includes('CURATIF NIVEAU 1'));
  assert.ok(html.includes('Échec temporaire'));
  assert.ok(html.includes('Réessayer'));
});
