/** Manual visual comparison for the completed Part 1. Never used by the app. */
import assert from 'node:assert/strict';
import { File as NodeFile } from 'node:buffer';
import { readFileSync, writeFileSync } from 'node:fs';
import JSZip from 'jszip';
import pptxgen from 'pptxgenjs';
import {
  appendPart1AdministrativeSlides,
  appendPart1ContentsSlides,
  appendPart1IntroductionSlides,
  planPart1Contents,
  type Part1PresentationAssets,
} from '../src/part1/part1Pptx.ts';
import { createEmptyPart1ReportData, type RoleVisuelPartie1 } from '../src/part1/reportData.ts';

const destination = process.argv[2];
if (!destination) throw new Error('Chemin de sortie PPTX requis.');

const reference = await JSZip.loadAsync(readFileSync(new URL('../docs/PPPT PART1+PART2 .pptx', import.meta.url)));
async function referenceImage(name: string, type: 'image/png' | 'image/jpeg'): Promise<string> {
  const entry = reference.file(`ppt/media/${name}`);
  assert.ok(entry, `Visuel manquant dans le modèle : ${name}`);
  return `data:${type};base64,${(await entry.async('nodebuffer')).toString('base64')}`;
}
function publicImage(relativePath: string): string {
  return `data:image/png;base64,${readFileSync(new URL(relativePath, import.meta.url)).toString('base64')}`;
}

const data = createEmptyPart1ReportData();
data.rapport = { dateVisite: '01/06/2026', dateRapport: '07/08/2026', version: 'Initiale' };
data.copropriete = { nom: 'LE COTE SQUARE', adresse: '18 Rue de la Barrière, Rive de Gier' };
data.donneurOrdre = {
  nom: "Régie l'immobilière Stéphanoise",
  adresse: '7 rue Voltaire 42100 Saint Etienne',
};
data.equipe = {
  chargeProjet: {
    nom: 'Anthony BELTRAN',
    fonction: 'Ingénieur thermicien – Chargé de projet du pôle Copropriété et Tertiaire',
  },
  verificateur: {
    nom: 'Mahmoud ATIQ',
    fonction: 'Ingénieur thermicien – Responsable du pôle Copropriété et Tertiaire',
  },
  intervenantSite: { nom: 'Youssef BICHA' },
};
data.cadastre = { reference: 'AV 0359' };
data.batiment = {
  periodeConstruction: 'Entre 2001 et 2010',
  dateReglementCopropriete: '06/03/2007',
  dateImmatriculation: '27/07/2017',
  numeroImmatriculation: 'AA7634256',
  nombreBatiments: 1,
  nombreEntrees: 1,
  nombreLots: 61,
  nombreNiveaux: 4,
  nombreLotsPrincipaux: 22,
  typeChauffage: 'Individuel',
  nombreLotsHabitation: 22,
  nombreAscenseurs: 1,
  shabApproximative: 1676.3,
  altitude: 250,
};
data.patrimoine = {
  aucunPerimetreProtection: 'concerne',
  sitePatrimonialRemarquable: 'non_concerne',
  abordsMonumentHistorique: 'non_concerne',
};

const entries: readonly [RoleVisuelPartie1, string, 'image/png' | 'image/jpeg', number, number][] = [
  ['photo_principale_copropriete', 'image6.JPEG', 'image/jpeg', 1536, 2048],
  ['extrait_cadastral', 'image7.png', 'image/png', 717, 530],
  ['vue_aerienne_rapprochee', 'image8.png', 'image/png', 517, 306],
  ['vue_patrimoniale', 'image9.png', 'image/png', 936, 596],
];
const visuals = {} as Part1PresentationAssets['visuals'];
for (const [role, name, mimeType, width, height] of entries) {
  const entry = reference.file(`ppt/media/${name}`)!;
  const bytes = await entry.async('nodebuffer');
  data.visuels[role] = new NodeFile([bytes], name, { type: mimeType }) as unknown as File;
  visuals[role] = { data: await referenceImage(name, mimeType), width, height };
}

const assets: Part1PresentationAssets = {
  logoData: publicImage('../public/france-verte-logo.png'),
  coverBlueCornerData: publicImage('../public/part1/cover-blue-corner.png'),
  coverYellowCornerData: publicImage('../public/part1/cover-yellow-corner.png'),
  rgeLogoData: publicImage('../public/part1/rge-opqibi.png'),
  stampData: publicImage('../public/part1/france-verte-stamp.png'),
  visuals,
};
const pptx = new pptxgen();
pptx.author = 'France Verte';
pptx.title = 'Aperçu de comparaison Partie 1';
const administrative = appendPart1AdministrativeSlides(pptx, data, assets);
const contentsPlan = planPart1Contents(5);
const contents = appendPart1ContentsSlides(pptx, data, assets.logoData, contentsPlan.entries, 5);
appendPart1IntroductionSlides(pptx, data, assets.logoData, contentsPlan.firstIntroductionPage);
administrative.finalize({ totalPages: 4 + contents.length + 3, firstPageNumber: 1 });
const output = await pptx.write({ outputType: 'nodebuffer', compression: true });
assert.ok(Buffer.isBuffer(output));
writeFileSync(destination, output, { flag: 'wx' });
process.stdout.write(`${destination}\n`);
