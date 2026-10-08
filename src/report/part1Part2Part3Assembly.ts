import pptxgen from 'pptxgenjs';
import type { InspectionImageItem } from '../types';
import type { Part1ReportData } from '../part1/reportData';
import {
  appendPart1AdministrativeSlides,
  appendPart1IntroductionSlides,
  planPart1Contents,
  reservePart1ContentsSlides,
  type Part1ContentsEntry,
  type Part1PresentationAssets,
} from '../part1/part1Pptx';
import { validatePart1ReportData } from '../part1/reportDataValidation';
import type { Part3ReportData } from '../part3/reportData';
import {
  appendPart3Slides,
  planPart3Contents,
  type Part3ContentsEntry,
  type Part3PresentationAssets,
} from '../part3/part3Pptx';
import { validatePart3ReportData } from '../part3/reportDataValidation';
import {
  appendDiagnosticSlides,
  getExportableDiagnostics,
  type DiagnosticPriorityStart,
} from '../utils/pptxExport';
import { part2ContentsEntries } from './part1Part2Assembly';
import { normalizePptxPackage } from './pptxPackageIntegrity';

/**
 * Internal validation artifact only. It intentionally has no UI entry point
 * and leaves the standalone Part 2 export untouched.
 */
export interface InternalPart1Part2Part3Assembly {
  presentation: pptxgen;
  contents: readonly Part1ContentsEntry[];
  priorityStarts: readonly DiagnosticPriorityStart[];
  part3Contents: readonly Part3ContentsEntry[];
  part3FirstPage: number;
  totalPages: number;
}

/**
 * Serializes the internal validation artefact as a structurally consistent
 * Open XML package. It is deliberately not connected to a user-facing export.
 */
export async function serializeInternalPart1Part2Part3Pptx(
  report: InternalPart1Part2Part3Assembly,
): Promise<Blob> {
  const output = await report.presentation.write({ outputType: 'blob', compression: true });
  if (!(output instanceof Blob)) throw new Error('La génération du PPTX de validation a échoué.');
  return normalizePptxPackage(output);
}

function asGlobalContentsEntries(entries: readonly Part3ContentsEntry[]): Part1ContentsEntry[] {
  return entries.map(({ label, page, level }) => ({ label, page, level }));
}

function asPlaceholderContentsEntries(
  entries: readonly Pick<Part3ContentsEntry, 'label' | 'level'>[],
): Part1ContentsEntry[] {
  return entries.map(({ label, level }) => ({ label, page: 1, level }));
}

function validatePart1AndPart3(data: Part1ReportData, part3Data: Part3ReportData): void {
  const part1Validation = validatePart1ReportData(data);
  if (!part1Validation.isValid) throw new Error(`Partie 1 incomplète : ${part1Validation.issues[0].message}`);

  const part3Validation = validatePart3ReportData(part3Data);
  if (!part3Validation.isValid) throw new Error(`Partie 3 incomplète : ${part3Validation.issues[0].message}`);
}

function sameContentsStructure(
  planned: readonly Pick<Part3ContentsEntry, 'label' | 'level'>[],
  actual: readonly Part3ContentsEntry[],
): boolean {
  return planned.length === actual.length
    && planned.every((entry, index) => entry.label === actual[index].label && entry.level === actual[index].level);
}

/**
 * Builds the complete P1 → P2 → P3 presentation for tests and visual
 * validation. The pure Part 3 outline reserves the correct number of Part 1
 * contents pages before any real slide is appended.
 */
export async function assemblePart1Part2Part3Internally(
  data: Part1ReportData,
  part1Assets: Part1PresentationAssets,
  part3Data: Part3ReportData,
  part3Assets: Part3PresentationAssets,
  items: readonly InspectionImageItem[],
  loadPhoto: Parameters<typeof appendDiagnosticSlides>[3],
): Promise<InternalPart1Part2Part3Assembly> {
  validatePart1AndPart3(data, part3Data);

  const exportable = getExportableDiagnostics(items);
  if (exportable.length === 0) throw new Error('Aucun diagnostic terminé et à jour à exporter.');

  const coproprieteName = data.copropriete.nom!.trim();
  const priorities = exportable
    .map((item) => item.result!.priorite)
    .filter((priority, index, all) => index === 0 || priority !== all[index - 1]);
  const part2Placeholders = priorities.map((priority): DiagnosticPriorityStart => ({ priority, page: 1 }));

  // Part 3 can add continuation slides, but its logical contents outline is
  // stable. Plan it before reserving the Part 1 contents pages, then replace
  // placeholders with the real page numbers after all slides are appended.
  const plannedPart3Contents = planPart3Contents();

  const contentsPage = 5;
  const plan = planPart1Contents(contentsPage, [
    ...part2ContentsEntries(part2Placeholders),
    ...asPlaceholderContentsEntries(plannedPart3Contents),
  ]);
  const part2FirstPage = plan.firstIntroductionPage + 3;

  const presentation = new pptxgen();
  presentation.author = 'France Verte';
  presentation.title = 'Projet de Plan Pluriannuel de Travaux';
  const administrative = appendPart1AdministrativeSlides(presentation, data, part1Assets);
  const contents = reservePart1ContentsSlides(
    presentation,
    data,
    part1Assets.logoData,
    plan.entries.length,
    contentsPage,
  );
  appendPart1IntroductionSlides(presentation, data, part1Assets.logoData, plan.firstIntroductionPage);

  const diagnostics = await appendDiagnosticSlides(
    presentation,
    items,
    part1Assets.logoData,
    loadPhoto,
    {
      firstPageNumber: part2FirstPage,
      // Part 2 expects the complete footer label, unlike Part 3.
      coproprieteName: `Copropriété ${coproprieteName}`,
    },
  );
  const part3FirstPage = part2FirstPage + diagnostics.slides.length;
  const part3 = appendPart3Slides(
    presentation,
    part3Data,
    items,
    part3Assets,
    { firstPageNumber: part3FirstPage, coproprieteName },
  );

  if (!sameContentsStructure(plannedPart3Contents, part3.contents)) {
    throw new Error('Les rubriques de la Partie 3 ont changé pendant l’assemblage.');
  }

  const actualPlan = planPart1Contents(contentsPage, [
    ...part2ContentsEntries(diagnostics.priorityStarts),
    ...asGlobalContentsEntries(part3.contents),
  ]);
  if (actualPlan.pageCount !== plan.pageCount || actualPlan.entries.length !== plan.entries.length) {
    throw new Error('La pagination du sommaire a changé pendant l’assemblage.');
  }

  contents.finalize(actualPlan.entries);
  const totalPages = part3FirstPage + part3.slides.length - 1;
  administrative.finalize({ totalPages, firstPageNumber: 1 });

  return {
    presentation,
    contents: actualPlan.entries,
    priorityStarts: diagnostics.priorityStarts,
    part3Contents: part3.contents,
    part3FirstPage,
    totalPages,
  };
}
