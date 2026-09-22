import {
  DIAGNOSTIC_NIVEAUX,
  STATUTS_ANALYSE,
  PERIMETRES_APPARENTS,
  NIVEAUX_CONFIANCE,
} from '../api/_lib/diagnosticContract.js';

export {
  DIAGNOSTIC_NIVEAUX,
  STATUTS_ANALYSE,
  PERIMETRES_APPARENTS,
  NIVEAUX_CONFIANCE,
};

export type DiagnosticNiveau = (typeof DIAGNOSTIC_NIVEAUX)[number];
export type StatutAnalyse = (typeof STATUTS_ANALYSE)[number];
export type PerimetreApparent = (typeof PERIMETRES_APPARENTS)[number];
export type NiveauConfiance = (typeof NIVEAUX_CONFIANCE)[number];

export interface DiagnosticResult {
  statut_analyse: StatutAnalyse;
  priorite: DiagnosticNiveau;
  domaines: string[];
  perimetre: PerimetreApparent;
  constat: string;
  risque: string;
  action: string;
  verification: string;
  confiance: NiveauConfiance;
  limites: string;
}

export interface InspectionImageItem {
  id: string;
  file: File;
  previewUrl: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  result?: DiagnosticResult;
  errorMessage?: string;
  analyzedAt?: string;
}
