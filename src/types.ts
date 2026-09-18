import {
  DIAGNOSTIC_NIVEAUX,
  STATUTS_ANALYSE,
  PERIMETRES_APPARENTS,
  ENJEUX_DIAGNOSTIC,
  NIVEAUX_CONFIANCE,
} from '../api/_lib/diagnosticContract.js';

export {
  DIAGNOSTIC_NIVEAUX,
  STATUTS_ANALYSE,
  PERIMETRES_APPARENTS,
  ENJEUX_DIAGNOSTIC,
  NIVEAUX_CONFIANCE,
};

export type DiagnosticNiveau = (typeof DIAGNOSTIC_NIVEAUX)[number];
export type StatutAnalyse = (typeof STATUTS_ANALYSE)[number];
export type PerimetreApparent = (typeof PERIMETRES_APPARENTS)[number];
export type EnjeuDiagnostic = (typeof ENJEUX_DIAGNOSTIC)[number];
export type NiveauConfiance = (typeof NIVEAUX_CONFIANCE)[number];

export interface DiagnosticResult {
  statut_analyse: StatutAnalyse;
  niveau: DiagnosticNiveau;
  domaines_techniques: string[];
  perimetre_apparent: PerimetreApparent;
  constat_factuel: string;
  hypotheses_causes: string[];
  enjeux: EnjeuDiagnostic[];
  risques_evolution: string;
  action_immediate: string;
  verification_preconisee: string;
  remediation_proposee: string;
  references_a_verifier: string[];
  niveau_confiance: NiveauConfiance;
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
