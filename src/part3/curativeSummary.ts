import type { DiagnosticNiveau, InspectionImageItem } from '../types';
import { getExportableDiagnostics } from '../utils/pptxExport';
import { REGLE_CHIFFRAGE_CURATIF_PARTIE3 } from './reportData';

export const NIVEAUX_CURATIFS_PARTIE3 = [
  'Curatif Niveau 1',
  'Curatif Niveau 2',
  'Curatif Niveau 3',
] as const;

export type NiveauCuratifPartie3 = (typeof NIVEAUX_CURATIFS_PARTIE3)[number];

export interface LigneRecapitulatifCuratifPartie3 {
  numero: number;
  niveau: NiveauCuratifPartie3;
  natureTravaux: string;
  montantEstimeTtcEur: number | null;
}

export interface RecapitulatifCuratifsPartie3 {
  lignes: readonly LigneRecapitulatifCuratifPartie3[];
  totauxParNiveau: Readonly<Record<NiveauCuratifPartie3, number | null>>;
  totalTtcEur: number | null;
  libelleChiffrage: typeof REGLE_CHIFFRAGE_CURATIF_PARTIE3.libelle;
}

function isNiveauCuratif(value: DiagnosticNiveau): value is NiveauCuratifPartie3 {
  return (NIVEAUX_CURATIFS_PARTIE3 as readonly DiagnosticNiveau[]).includes(value);
}

/**
 * Converts Part 2's estimate range into the single editable amount required
 * by the reference recap table. No valid range means no amount to invent.
 */
export function deriveEstimatedCurativeAmount(minimum: number, maximum: number): number | null {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum <= 0 || maximum <= 0 || maximum < minimum) {
    return null;
  }
  return Math.round((minimum + maximum) / 2);
}

function totalFor(lines: readonly LigneRecapitulatifCuratifPartie3[]): number | null {
  if (lines.length === 0) return 0;
  if (lines.some((line) => line.montantEstimeTtcEur === null)) return null;
  return lines.reduce((sum, line) => sum + line.montantEstimeTtcEur!, 0);
}

/**
 * Reads the same eligible and ordered diagnostics as Part 2, then keeps only
 * the three curative priorities for Table 1. It never mutates Part 2 data.
 */
export function buildPart3CurativeSummary(items: readonly InspectionImageItem[]): RecapitulatifCuratifsPartie3 {
  const lignes = getExportableDiagnostics(items)
    .filter((item) => isNiveauCuratif(item.result!.priorite))
    .map((item, index): LigneRecapitulatifCuratifPartie3 => ({
      numero: index + 1,
      niveau: item.result!.priorite as NiveauCuratifPartie3,
      natureTravaux: item.result!.intervention,
      montantEstimeTtcEur: deriveEstimatedCurativeAmount(
        item.result!.cout_estime_min_ttc_eur,
        item.result!.cout_estime_max_ttc_eur,
      ),
    }));

  const totauxParNiveau = Object.fromEntries(
    NIVEAUX_CURATIFS_PARTIE3.map((niveau) => [niveau, totalFor(lignes.filter((line) => line.niveau === niveau))]),
  ) as Record<NiveauCuratifPartie3, number | null>;

  return {
    lignes,
    totauxParNiveau,
    totalTtcEur: totalFor(lignes),
    libelleChiffrage: REGLE_CHIFFRAGE_CURATIF_PARTIE3.libelle,
  };
}
