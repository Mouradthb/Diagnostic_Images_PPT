// Valeurs partagées par le schéma Gemini, la validation serveur et l'interface.
export const DIAGNOSTIC_NIVEAUX = [
  'Entretien',
  'Signalement hors PPPT à vérifier',
  'Curatif Niveau 1',
  'Curatif Niveau 2',
  'Curatif Niveau 3',
  'Travaux énergétiques',
  'À confirmer / expertise nécessaire',
] as const;

export const STATUTS_ANALYSE = [
  'constat photographique indicatif',
  'image non exploitable',
  'expertise nécessaire',
] as const;

export const PERIMETRES_APPARENTS = [
  'partie commune',
  'partie privative',
  'partie commune à jouissance privative',
  'indéterminé',
] as const;

export const NIVEAUX_CONFIANCE = ['faible', 'moyen', 'élevé'] as const;
