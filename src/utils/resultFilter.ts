import type { DiagnosticNiveau, InspectionImageItem } from '../types';

/**
 * A priority filter only narrows completed diagnostics. In-progress and failed
 * items always remain visible so an operational issue is never hidden by a
 * reading filter.
 */
export function filterDisplayedResults(
  items: readonly InspectionImageItem[],
  selectedPriority: DiagnosticNiveau | null,
): InspectionImageItem[] {
  return items.filter((item) => {
    if (item.status === 'pending') return false;
    if (!selectedPriority || item.status === 'error' || item.status === 'analyzing') return true;
    return item.result?.priorite === selectedPriority;
  });
}

/** Count only completed diagnostic cards matching the active legend entry. */
export function countPriorityResults(
  items: readonly InspectionImageItem[],
  priority: DiagnosticNiveau,
): number {
  return items.filter((item) => item.status === 'completed' && item.result?.priorite === priority).length;
}
