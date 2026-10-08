import type { Part1PresentationAssets } from '../part1/part1Pptx';
import { loadPart1PresentationAssets } from '../part1/part1Pptx';
import type { Part1ReportData } from '../part1/reportData';
import type { Part3PresentationAssets } from '../part3/part3Pptx';
import { loadPart3PresentationAssets } from '../part3/part3Pptx';
import type { Part3ReportData } from '../part3/reportData';
import type { InspectionImageItem } from '../types';
import { appendDiagnosticSlides, prepareDiagnosticPhotoForPptx } from '../utils/pptxExport';
import {
  assemblePart1Part2Part3Internally,
  serializeInternalPart1Part2Part3Pptx,
  type InternalPart1Part2Part3Assembly,
} from './part1Part2Part3Assembly';
import { firstFinalReportBlocker, getFinalReportReadiness } from './finalReportReadiness';

export interface FinalReportExportInput {
  part1Data: Part1ReportData;
  part3Data: Part3ReportData;
  items: readonly InspectionImageItem[];
}

type DiagnosticPhotoLoader = Parameters<typeof appendDiagnosticSlides>[3];

export interface FinalReportExportRuntime {
  loadAssets: (part1Data: Part1ReportData, part3Data: Part3ReportData) => Promise<{
    part1Assets: Part1PresentationAssets;
    part3Assets: Part3PresentationAssets;
  }>;
  loadPhoto: DiagnosticPhotoLoader;
  assemble: (
    part1Data: Part1ReportData,
    part1Assets: Part1PresentationAssets,
    part3Data: Part3ReportData,
    part3Assets: Part3PresentationAssets,
    items: readonly InspectionImageItem[],
    loadPhoto: DiagnosticPhotoLoader,
  ) => Promise<InternalPart1Part2Part3Assembly>;
  serialize: (report: InternalPart1Part2Part3Assembly) => Promise<Blob>;
}

async function loadAssets(part1Data: Part1ReportData, part3Data: Part3ReportData) {
  const [part1Assets, part3Assets] = await Promise.all([
    loadPart1PresentationAssets(part1Data),
    loadPart3PresentationAssets(part3Data),
  ]);
  return { part1Assets, part3Assets };
}

const browserRuntime: FinalReportExportRuntime = {
  loadAssets,
  loadPhoto: prepareDiagnosticPhotoForPptx,
  assemble: assemblePart1Part2Part3Internally,
  serialize: serializeInternalPart1Part2Part3Pptx,
};

/**
 * Produces one editable A4 PPPT file from the already validated three-part
 * report. It is browser-only and never calls Gemini or the analysis API.
 */
export async function buildUnifiedPpptx(
  input: FinalReportExportInput,
  runtime: FinalReportExportRuntime = browserRuntime,
): Promise<Blob> {
  const readiness = getFinalReportReadiness(input);
  if (!readiness.isReady) {
    const blocker = firstFinalReportBlocker(readiness);
    throw new Error(blocker?.message ?? 'Le rapport PPPT complet ne peut pas encore être généré.');
  }

  const { part1Assets, part3Assets } = await runtime.loadAssets(input.part1Data, input.part3Data);
  const report = await runtime.assemble(
    input.part1Data,
    part1Assets,
    input.part3Data,
    part3Assets,
    input.items,
    runtime.loadPhoto,
  );
  return runtime.serialize(report);
}

function safeFileNameSegment(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[-_.]+|[-_.]+$/g, '');
  return normalized || fallback;
}

function dateSegment(value: string | null): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? '');
  return match ? `${match[3]}-${match[2]}-${match[1]}` : 'date-rapport';
}

export function createUnifiedPpptxFileName(data: Part1ReportData): string {
  return `PPPT_${safeFileNameSegment(data.copropriete.nom, 'copropriete')}_${dateSegment(data.rapport.dateRapport)}_${safeFileNameSegment(data.rapport.version, 'version')}.pptx`;
}
