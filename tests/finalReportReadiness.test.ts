import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyPart3ReportData } from '../src/part3/reportData.ts';
import { getFinalReportReadiness } from '../src/report/finalReportReadiness.ts';
import { completePart1Fixture, completePart3Fixture, diagnosticFixture } from './helpers/reportFixtures.ts';

test('final-report readiness accepts complete P1/P2/P3 data without optional DPE captures', () => {
  const readiness = getFinalReportReadiness({
    part1Data: completePart1Fixture(),
    part3Data: completePart3Fixture(),
    items: [diagnosticFixture()],
  });

  assert.equal(readiness.isReady, true);
  assert.equal(readiness.part1.isReady, true);
  assert.equal(readiness.diagnostics.exportable, 1);
  assert.equal(readiness.part3.completedStatuses, 17);
  assert.equal(readiness.blockers.length, 0);
});

test('final-report readiness blocks each unresolved Part 2 state without changing eligibility', () => {
  const current = diagnosticFixture();
  const pending = { ...diagnosticFixture('Entretien'), id: 'pending', status: 'pending' as const, result: undefined };
  const failed = { ...diagnosticFixture('Curatif Niveau 2'), id: 'failed', status: 'error' as const, errorMessage: 'Erreur locale' };
  const outdated = {
    ...diagnosticFixture('Curatif Niveau 3'),
    id: 'outdated',
    localisation: 'partie privative' as const,
    analyzedLocalisation: 'non renseignée' as const,
  };
  const readiness = getFinalReportReadiness({
    part1Data: completePart1Fixture(),
    part3Data: completePart3Fixture(),
    items: [current, pending, failed, outdated],
  });

  assert.equal(readiness.diagnostics.exportable, 1, 'Les diagnostics en attente, en erreur ou périmés restent exclus du décompte exportable.');
  assert.equal(readiness.isReady, false);
  assert.ok(readiness.blockers.some((blocker) => blocker.code === 'diagnostics_pending'));
  assert.ok(readiness.blockers.some((blocker) => blocker.code === 'diagnostics_error'));
  assert.ok(readiness.blockers.some((blocker) => blocker.code === 'diagnostics_outdated'));
});

test('final-report readiness distinguishes missing Part 3 statuses from optional DPE captures', () => {
  const incompletePart3 = createEmptyPart3ReportData();
  const readiness = getFinalReportReadiness({
    part1Data: completePart1Fixture(),
    part3Data: incompletePart3,
    items: [diagnosticFixture()],
    hasPart3TransientInputError: true,
  });

  assert.equal(readiness.part3.completedStatuses, 0);
  assert.equal(readiness.part3.isReady, false);
  assert.ok(readiness.blockers.some((blocker) => blocker.code === 'part3_incomplete'));
  assert.ok(readiness.blockers.some((blocker) => blocker.code === 'part3_transient_input_error'));
});

test('final-report readiness blocks a report with no selected diagnostics', () => {
  const readiness = getFinalReportReadiness({
    part1Data: completePart1Fixture(),
    part3Data: completePart3Fixture(),
    items: [],
  });

  assert.equal(readiness.isReady, false);
  assert.ok(readiness.blockers.some((blocker) => blocker.code === 'no_diagnostics'));
});
