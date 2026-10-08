import type { Part1ReportData } from '../part1/reportData';
import { PART1_REQUIRED_FIELD_PATHS, PART1_REQUIRED_VISUAL_ROLES, validatePart1ReportData } from '../part1/reportDataValidation';
import type { Part3ReportData } from '../part3/reportData';
import { PART3_REQUIRED_STATUS_PATHS } from '../part3/reportData';
import { validatePart3ReportData } from '../part3/reportDataValidation';
import type { InspectionImageItem } from '../types';
import { isResultOutdated } from '../utils/analysisRetry';
import { getExportableDiagnostics } from '../utils/pptxExport';

export type FinalReportWorkspace = 'part1' | 'diagnostics' | 'part3';

export type FinalReportBlockerCode =
  | 'part1_incomplete'
  | 'no_diagnostics'
  | 'diagnostics_pending'
  | 'diagnostics_analyzing'
  | 'diagnostics_error'
  | 'diagnostics_outdated'
  | 'diagnostics_missing_result'
  | 'no_exportable_diagnostic'
  | 'part3_incomplete'
  | 'part3_transient_input_error';

export interface FinalReportBlocker {
  code: FinalReportBlockerCode;
  workspace: FinalReportWorkspace;
  message: string;
}

export interface FinalReportReadinessInput {
  part1Data: Part1ReportData;
  part3Data: Part3ReportData;
  items: readonly InspectionImageItem[];
  isAnalyzing?: boolean;
  hasPart3TransientInputError?: boolean;
}

export interface FinalReportReadiness {
  isReady: boolean;
  blockers: readonly FinalReportBlocker[];
  part1: {
    isReady: boolean;
    completed: number;
    total: number;
    issueCount: number;
  };
  diagnostics: {
    isReady: boolean;
    selected: number;
    exportable: number;
    pending: number;
    analyzing: number;
    errors: number;
    outdated: number;
    missingResult: number;
  };
  part3: {
    isReady: boolean;
    completedStatuses: number;
    totalStatuses: number;
    issueCount: number;
  };
}

function countRequiredIssues(issues: readonly { code: string }[]): number {
  return issues.filter((issue) => issue.code === 'champ_requis').length;
}

/**
 * Computes the exact preflight for the final report without changing the
 * standalone Part 2 eligibility rules. The final report is deliberately
 * stricter: no selected photograph may be pending, stale or failed silently.
 */
export function getFinalReportReadiness({
  part1Data,
  part3Data,
  items,
  isAnalyzing = false,
  hasPart3TransientInputError = false,
}: FinalReportReadinessInput): FinalReportReadiness {
  const blockers: FinalReportBlocker[] = [];
  const part1Validation = validatePart1ReportData(part1Data);
  const part3Validation = validatePart3ReportData(part3Data);
  const part1Total = PART1_REQUIRED_FIELD_PATHS.length + PART1_REQUIRED_VISUAL_ROLES.length;
  const part3Total = PART3_REQUIRED_STATUS_PATHS.length;
  const part1Missing = countRequiredIssues(part1Validation.issues);
  const part3Missing = countRequiredIssues(part3Validation.issues);

  const pending = items.filter((item) => item.status === 'pending').length;
  const analyzing = items.filter((item) => item.status === 'analyzing').length;
  const errors = items.filter((item) => item.status === 'error').length;
  const outdated = items.filter(isResultOutdated).length;
  const missingResult = items.filter((item) => item.status === 'completed' && !item.result).length;
  const exportable = getExportableDiagnostics(items).length;

  if (!part1Validation.isValid) {
    blockers.push({
      code: 'part1_incomplete',
      workspace: 'part1',
      message: `Partie 1 incomplète : ${part1Validation.issues[0].message}`,
    });
  }

  if (items.length === 0) {
    blockers.push({
      code: 'no_diagnostics',
      workspace: 'diagnostics',
      message: 'Importez puis analysez au moins une photo avant de générer le rapport complet.',
    });
  }
  if (isAnalyzing || analyzing > 0) {
    blockers.push({
      code: 'diagnostics_analyzing',
      workspace: 'diagnostics',
      message: 'Attendez la fin de l’analyse des photos avant de générer le rapport complet.',
    });
  }
  if (pending > 0) {
    blockers.push({
      code: 'diagnostics_pending',
      workspace: 'diagnostics',
      message: `${pending} photo${pending > 1 ? 's restent' : ' reste'} à analyser ou à retirer.`,
    });
  }
  if (errors > 0) {
    blockers.push({
      code: 'diagnostics_error',
      workspace: 'diagnostics',
      message: `${errors} photo${errors > 1 ? 's présentent' : ' présente'} une erreur à reprendre ou à retirer.`,
    });
  }
  if (outdated > 0) {
    blockers.push({
      code: 'diagnostics_outdated',
      workspace: 'diagnostics',
      message: `${outdated} diagnostic${outdated > 1 ? 's doivent' : ' doit'} être actualisé après une modification de localisation.`,
    });
  }
  if (missingResult > 0) {
    blockers.push({
      code: 'diagnostics_missing_result',
      workspace: 'diagnostics',
      message: `${missingResult} diagnostic${missingResult > 1 ? 's terminés' : ' terminé'} ne possède pas de résultat exploitable.`,
    });
  }
  if (items.length > 0 && exportable === 0) {
    blockers.push({
      code: 'no_exportable_diagnostic',
      workspace: 'diagnostics',
      message: 'Aucun diagnostic terminé et à jour ne peut être inclus dans le rapport complet.',
    });
  }

  if (!part3Validation.isValid) {
    blockers.push({
      code: 'part3_incomplete',
      workspace: 'part3',
      message: `Partie 3 incomplète : ${part3Validation.issues[0].message}`,
    });
  }
  if (hasPart3TransientInputError) {
    blockers.push({
      code: 'part3_transient_input_error',
      workspace: 'part3',
      message: 'Un visuel DPE sélectionné est invalide. Remplacez-le ou retirez-le avant l’export.',
    });
  }

  return {
    isReady: blockers.length === 0,
    blockers,
    part1: {
      isReady: part1Validation.isValid,
      completed: Math.max(0, part1Total - part1Missing),
      total: part1Total,
      issueCount: part1Validation.issues.length,
    },
    diagnostics: {
      isReady: items.length > 0
        && exportable > 0
        && !isAnalyzing
        && pending === 0
        && analyzing === 0
        && errors === 0
        && outdated === 0
        && missingResult === 0,
      selected: items.length,
      exportable,
      pending,
      analyzing,
      errors,
      outdated,
      missingResult,
    },
    part3: {
      isReady: part3Validation.isValid && !hasPart3TransientInputError,
      completedStatuses: Math.max(0, part3Total - part3Missing),
      totalStatuses: part3Total,
      issueCount: part3Validation.issues.length + (hasPart3TransientInputError ? 1 : 0),
    },
  };
}

export function firstFinalReportBlocker(readiness: FinalReportReadiness): FinalReportBlocker | undefined {
  return readiness.blockers[0];
}
