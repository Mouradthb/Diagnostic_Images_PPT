import { readFileSync } from 'node:fs';
import pptxgen from 'pptxgenjs';
import { appendPart3Slides, type Part3PresentationAssets } from '../src/part3/part3Pptx';
import { createEmptyPart3ReportData } from '../src/part3/reportData';
import type { DiagnosticResult, InspectionImageItem } from '../src/types';

const png = (path: string) => `data:image/png;base64,${readFileSync(new URL(path, import.meta.url)).toString('base64')}`;
const jpeg = (path: string) => `data:image/jpeg;base64,${readFileSync(new URL(path, import.meta.url)).toString('base64')}`;

const data = createEmptyPart3ReportData();
let row = 0;
for (const table of Object.values(data.documentation)) {
  for (const value of Object.values(table)) {
    value.statut = (['transmis', 'non_concerne', 'non_transmis'] as const)[row % 3];
    row += 1;
  }
}

const assets: Part3PresentationAssets = {
  logoData: png('../public/france-verte-logo.png'),
  dpeVisuals: {},
  staticAssets: {
    defibrillatorData: png('../public/part3/image2.png'),
    dpeClassDData: png('../public/part3/image3.png'),
    dpeClassEData: png('../public/part3/image4.png'),
    dpeClassFData: png('../public/part3/image5.png'),
    dpeClassGData: png('../public/part3/image6.png'),
    maPrimeRenovLogoData: png('../public/part3/image7.png'),
    maPrimeRenovTableData: png('../public/part3/image8.png'),
    ceeLogoData: png('../public/part3/image9.png'),
    ecoPtzData: jpeg('../public/part3/image10.jpg'),
    tvaData: jpeg('../public/part3/image11.jpeg'),
  },
};

function diagnostic(id: string, priority: DiagnosticResult['priorite'], minimum: number, maximum: number, intervention: string): InspectionImageItem {
  const result: DiagnosticResult = {
    statut_analyse: 'constat photographique indicatif',
    priorite: priority,
    famille: 'Famille de validation',
    localisation: 'Parties communes',
    perimetre: 'indéterminé',
    etat_observations: 'Constat fictif destiné uniquement à valider la présentation.',
    intervention,
    cout_estime_min_ttc_eur: minimum,
    cout_estime_max_ttc_eur: maximum,
    confiance: 'moyen',
  };
  return {
    id, file: {} as File, fileName: `${id}.jpg`, fileSize: 100,
    previewUrl: 'blob:validation', status: 'completed',
    localisation: 'partie commune', analyzedLocalisation: 'partie commune', result,
  };
}

const items = [
  diagnostic('validation-c1-1', 'Curatif Niveau 1', 900, 1100, 'Sécurisation de l’accès à un local technique.'),
  diagnostic('validation-c1-2', 'Curatif Niveau 1', 1200, 1600, 'Remise en état d’un élément de sécurité collectif.'),
  diagnostic('validation-c3-1', 'Curatif Niveau 3', 4000, 5000, 'Réfection programmée d’un revêtement des parties communes.'),
  diagnostic('validation-c3-2', 'Curatif Niveau 3', 1500, 2000, 'Entretien et remise en état d’une menuiserie commune.'),
];

const pptx = new pptxgen();
pptx.author = 'France Verte — validation interne';
pptx.title = 'Partie 3 — validation visuelle, données fictives';
appendPart3Slides(pptx, data, items, assets, { coproprieteName: 'VALIDATION FICTIVE', firstPageNumber: 1 });
await pptx.writeFile({ fileName: new URL('../artifacts/PART3-correction-validation-20261007-r4.pptx', import.meta.url).pathname });
