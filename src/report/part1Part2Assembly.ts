import pptxgen from 'pptxgenjs';
import type { InspectionImageItem, DiagnosticNiveau } from '../types';
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
import {
  appendDiagnosticSlides,
  getExportableDiagnostics,
  type DiagnosticPriorityStart,
} from '../utils/pptxExport';

const PRIORITY_TOC_LABELS: Record<DiagnosticNiveau, string> = {
  Entretien: 'Entretien',
  'Signalement hors PPPT à vérifier': 'Signalement',
  'Curatif Niveau 1': 'Curatif Niveau 1',
  'Curatif Niveau 2': 'Curatif Niveau 2',
  'Curatif Niveau 3': 'Curatif Niveau 3',
  'Travaux énergétiques': 'Travaux énergétiques',
  'À confirmer / expertise nécessaire': 'À confirmer',
};

export interface InternalPart1Part2Assembly {
  presentation: pptxgen;
  contents: readonly Part1ContentsEntry[];
  priorityStarts: readonly DiagnosticPriorityStart[];
  totalPages: number;
}

/**
 * Builds the Part 2 portion of the global contents from the actual category
 * starts returned by the validated Part 2 renderer. This stays deliberately
 * separate from the renderer so an internal report composer can reuse the
 * exact same priority ordering without changing the autonomous export.
 */
export function part2ContentsEntries(starts: readonly DiagnosticPriorityStart[]): Part1ContentsEntry[] {
  return [
    { label: '2. Identification et hiérarchisation des travaux et observations', page: starts[0].page, level: 0 },
    ...starts.map(({ priority, page }, index): Part1ContentsEntry => ({
      label: `2.${index + 1} ${PRIORITY_TOC_LABELS[priority]}`,
      page,
      level: 1,
    })),
  ];
}

/** Internal composition preview. It is not the final P1+P2+P3 report or a user export. */
export async function assemblePart1Part2Internally(
  data: Part1ReportData,
  assets: Part1PresentationAssets,
  items: readonly InspectionImageItem[],
  loadPhoto: Parameters<typeof appendDiagnosticSlides>[3],
): Promise<InternalPart1Part2Assembly> {
  const validation = validatePart1ReportData(data);
  if (!validation.isValid) throw new Error(`Partie 1 incomplète : ${validation.issues[0].message}`);
  const exportable = getExportableDiagnostics(items);
  if (exportable.length === 0) throw new Error('Aucun diagnostic terminé et à jour à exporter.');

  const priorities = exportable
    .map((item) => item.result!.priorite)
    .filter((priority, index, all) => index === 0 || priority !== all[index - 1]);
  const placeholderStarts = priorities.map((priority): DiagnosticPriorityStart => ({ priority, page: 1 }));
  const contentsPage = 5;
  const plan = planPart1Contents(contentsPage, part2ContentsEntries(placeholderStarts));
  const part2FirstPage = plan.firstIntroductionPage + 3;

  const pptx = new pptxgen();
  pptx.author = 'France Verte';
  pptx.title = 'Projet de Plan Pluriannuel de Travaux';
  const administrative = appendPart1AdministrativeSlides(pptx, data, assets);
  const contents = reservePart1ContentsSlides(pptx, data, assets.logoData, plan.entries.length, contentsPage);
  appendPart1IntroductionSlides(pptx, data, assets.logoData, plan.firstIntroductionPage);
  const diagnostics = await appendDiagnosticSlides(pptx, items, assets.logoData, loadPhoto, {
    firstPageNumber: part2FirstPage,
    coproprieteName: `Copropriété ${data.copropriete.nom!.trim()}`,
  });
  const actualPlan = planPart1Contents(contentsPage, part2ContentsEntries(diagnostics.priorityStarts));
  if (actualPlan.pageCount !== plan.pageCount) throw new Error('La pagination du sommaire a changé pendant l’assemblage.');
  contents.finalize(actualPlan.entries);
  const totalPages = part2FirstPage + diagnostics.slides.length - 1;
  administrative.finalize({ totalPages, firstPageNumber: 1 });
  return { presentation: pptx, contents: actualPlan.entries,
    priorityStarts: diagnostics.priorityStarts, totalPages };
}
