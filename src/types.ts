export type DiagnosticNiveau =
  | 'Curatif Niveau 1'
  | 'Curatif Niveau 2'
  | 'Curatif Niveau 3'
  | 'Entretien'
  | 'Signalement'
  | 'Travaux énergétiques';

export interface DiagnosticResult {
  niveau: DiagnosticNiveau;
  description_probleme: string;
  remediation_proposee: string;
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
