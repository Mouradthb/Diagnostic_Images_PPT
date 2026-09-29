import assert from 'node:assert/strict';
import test from 'node:test';
import type { DiagnosticNiveau, DiagnosticResult, InspectionImageItem } from '../src/types.ts';
import { countPriorityResults, filterDisplayedResults } from '../src/utils/resultFilter.ts';

const result = (priorite: DiagnosticNiveau): DiagnosticResult => ({
  statut_analyse: 'constat photographique indicatif',
  priorite,
  domaines: [],
  perimetre: 'indéterminé',
  constat: 'Constat de test.',
  risque: 'Risque de test.',
  action: 'Action de test.',
  verification: 'Vérification de test.',
  confiance: 'faible',
  limites: 'Limite de test.',
});

function item(
  id: string,
  status: InspectionImageItem['status'],
  priorite?: DiagnosticNiveau,
): InspectionImageItem {
  return {
    id,
    file: {} as File,
    previewUrl: '',
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
