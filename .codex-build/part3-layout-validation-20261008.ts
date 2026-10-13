import { readFileSync } from 'node:fs';
import pptxgen from 'pptxgenjs';
import { appendPart3Slides, type Part3PresentationAssets } from '../src/part3/part3Pptx';
import { createEmptyPart3ReportData } from '../src/part3/reportData';
import type { DiagnosticResult, InspectionImageItem } from '../src/types';

const png = (path: string) => `data:image/png;base64,${readFileSync(new URL(path, import.meta.url)).toString('base64')}`;
const jpeg = (path: string) => `data:image/jpeg;base64,${readFileSync(new URL(path, import.meta.url)).toString('base64')}`;
const data = createEmptyPart3ReportData();
for (const table of Object.values(data.documentation)) {
  for (const entry of Object.values(table)) entry.statut = 'transmis';
}
const assets: Part3PresentationAssets = {
  logoData: png('../public/france-verte-logo.png'),
  dpeVisuals: {},
  staticAssets: { ecoPtzData: jpeg('../public/part3/image10.jpg') },
};
const intervention = `Il convient de procéder à une vérification urgente sur site afin de confirmer la présence et la conformité de l’équipement. ${'Prévoir ensuite sa remise en état et un contrôle de sécurité adapté aux parties communes. '.repeat(3)}`;

function diagnostic(index: number): InspectionImageItem {
  const result: DiagnosticResult = {
    statut_analyse: 'constat photographique indicatif',
    priorite: 'Curatif Niveau 1',
    famille: 'Famille de validation',
    localisation: 'Parties communes',
    perimetre: 'indéterminé',
    etat_observations: 'Constat fictif destiné uniquement à valider la présentation.',
    intervention,
    cout_estime_min_ttc_eur: 100 * index,
    cout_estime_max_ttc_eur: 300 * index,
    confiance: 'moyen',
  };
  return {
    id: `validation-c${index}`, file: {} as File, fileName: `c${index}.jpg`, fileSize: 100,
    previewUrl: 'blob:validation', status: 'completed', localisation: 'partie commune',
    analyzedLocalisation: 'partie commune', result,
  };
}

const pptx = new pptxgen();
appendPart3Slides(pptx, data, [diagnostic(1), diagnostic(2), diagnostic(3)], assets, {
  coproprieteName: 'VALIDATION FICTIVE', firstPageNumber: 1,
});
await pptx.writeFile({ fileName: new URL('../artifacts/PART3-layout-validation-20261008.pptx', import.meta.url).pathname });
