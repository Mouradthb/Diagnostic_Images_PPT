import assert from 'node:assert/strict';
import test from 'node:test';
import type { Part1PresentationAssets } from '../src/part1/part1Pptx.ts';
import type { Part3PresentationAssets } from '../src/part3/part3Pptx.ts';
import {
  buildUnifiedPpptx,
  createUnifiedPpptxFileName,
  type FinalReportExportRuntime,
} from '../src/report/finalReportExport.ts';
import type { InternalPart1Part2Part3Assembly } from '../src/report/part1Part2Part3Assembly.ts';
import { completePart1Fixture, completePart3Fixture, diagnosticFixture } from './helpers/reportFixtures.ts';

function runtime(overrides: Partial<FinalReportExportRuntime> = {}): FinalReportExportRuntime {
  return {
    loadAssets: async () => ({
      part1Assets: {} as Part1PresentationAssets,
      part3Assets: {} as Part3PresentationAssets,
    }),
    loadPhoto: async () => ({ data: 'data:image/png;base64,AA==', width: 1, height: 1 }),
    assemble: async () => ({}) as InternalPart1Part2Part3Assembly,
    serialize: async () => new Blob(['pptx']),
    ...overrides,
  };
}

test('unified export delegates only after the pure preflight succeeds', async () => {
  let assembled = false;
  let serialized = false;
  const file = await buildUnifiedPpptx({
    part1Data: completePart1Fixture(),
    part3Data: completePart3Fixture(),
    items: [diagnosticFixture()],
  }, runtime({
    assemble: async () => {
      assembled = true;
      return {} as InternalPart1Part2Part3Assembly;
    },
    serialize: async () => {
      serialized = true;
      return new Blob(['rapport']);
    },
  }));

  assert.equal(await file.text(), 'rapport');
  assert.equal(assembled, true);
  assert.equal(serialized, true);
});

test('unified export rejects incomplete data before loading presentation assets', async () => {
  let assetsLoaded = false;
  await assert.rejects(
    buildUnifiedPpptx({
      part1Data: completePart1Fixture(),
      part3Data: completePart3Fixture(),
      items: [],
    }, runtime({ loadAssets: async () => {
      assetsLoaded = true;
      throw new Error('Ne doit pas être appelé');
    } })),
    /Importez puis analysez au moins une photo/,
  );
  assert.equal(assetsLoaded, false);
});

test('unified export preserves asset-loading errors and creates a safe descriptive filename', async () => {
  const data = completePart1Fixture();
  data.copropriete.nom = 'Résidence / Test : Nord';
  assert.equal(createUnifiedPpptxFileName(data), 'PPPT_Résidence_-_Test_-_Nord_2026-09-12_Finale.pptx');

  await assert.rejects(
    buildUnifiedPpptx({
      part1Data: data,
      part3Data: completePart3Fixture(),
      items: [diagnosticFixture()],
    }, runtime({ loadAssets: async () => { throw new Error('Logo France Verte indisponible'); } })),
    /Logo France Verte indisponible/,
  );
});
