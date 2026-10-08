import pptxgen from 'pptxgenjs';
import {
  ROLES_VISUELS_PARTIE1,
  type Part1ReportData,
  type RoleVisuelPartie1,
  type StatutPatrimonial,
} from './reportData';
import { validatePart1ReportData } from './reportDataValidation';

type Slide = ReturnType<pptxgen['addSlide']>;

export interface PreparedPart1Visual {
  data: string;
  width: number;
  height: number;
}

export interface Part1PresentationAssets {
  logoData: string;
  coverBlueCornerData: string;
  coverYellowCornerData: string;
  rgeLogoData: string;
  stampData: string;
  visuals: Record<RoleVisuelPartie1, PreparedPart1Visual>;
}

export interface Part1AdministrativeSlides {
  slides: [Slide, Slide, Slide, Slide];
  /** Add page references once the complete presentation's size is known. */
  finalize: (metadata: { totalPages: number; firstPageNumber: number }) => void;
}

export interface Part1ContentsEntry {
  label: string;
  page: number;
  level: 0 | 1;
}

export interface Part1ContentsPlan {
  entries: readonly Part1ContentsEntry[];
  pageCount: number;
  firstIntroductionPage: number;
}

export interface ReservedPart1Contents {
  slides: Slide[];
  /** Fill the reserved pages once later sections have returned their actual starts. */
  finalize: (entries: readonly Part1ContentsEntry[]) => void;
}

export const PART1_A4 = {
  width: 7559675 / 914400,
  height: 10691813 / 914400,
} as const;

const FONT = 'Calibri';
const INK = '1C1C1C';
const BLUE = '2D44FF';
const GREEN = '00B55A';
const YELLOW = 'FFC700';
const GRAY = 'D9D9D9';
const BORDER = '242424';
const WHITE = 'FFFFFF';
const MUTED = '808080';
const CONTENTS_ROWS_PER_PAGE = 20;
const mm = (value: number) => value / 25.4;

const PART1_INTRODUCTION_CONTENTS = [
  '1.1 Cadre réglementaire du Projet de Plan Pluriannuel de Travaux (PPPT)',
  '1.2 Validité du présent rapport',
  '1.3 Périmètre de la mission et réserves',
  '1.4 Limite de la mission',
  '1.5 Hiérarchisation des travaux et des observations',
] as const;

const FRANCE_VERTE = {
  email: 'contact@groupefranceverte.fr',
  telephone: '09 86 08 79 79',
  adresse: '22 Avenue Barthélémy Thimonnier, 69300 Caluire-et-Cuire',
  site: 'https://www.francevertepro.fr/',
} as const;

function requiredText(value: string | null): string {
  return value!.trim();
}

function numericText(value: number | null): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value!);
}

function addText(
  slide: Slide,
  text: Parameters<Slide['addText']>[0],
  x: number,
  y: number,
  w: number,
  h: number,
  options: Parameters<Slide['addText']>[1] = {},
): void {
  slide.addText(text, {
    x: mm(x), y: mm(y), w: mm(w), h: mm(h),
    fontFace: FONT, fontSize: 11, color: INK,
    margin: 0, breakLine: false, valign: 'middle',
    fit: 'shrink', wrap: true,
    ...options,
  });
}

function addRect(slide: Slide, x: number, y: number, w: number, h: number,
  fill: string = WHITE, lineColor: string = BORDER, lineWidth = 0.8): void {
  slide.addShape('rect', {
    x: mm(x), y: mm(y), w: mm(w), h: mm(h),
    line: { color: lineColor, width: lineWidth },
    fill: { color: fill },
  });
}

function addRule(slide: Slide, x: number, y: number, w: number, h: number, color: string): void {
  slide.addShape('rect', {
    x: mm(x), y: mm(y), w: mm(w), h: mm(h),
    line: { color, transparency: 100 }, fill: { color },
  });
}

function addImage(slide: Slide, data: string, x: number, y: number, w: number, h: number,
  mode: 'contain' | 'cover', altText: string, rotate = 0): void {
  slide.addImage({
    data, x: mm(x), y: mm(y), w: mm(w), h: mm(h),
    sizing: { type: mode, w: mm(w), h: mm(h) },
    altText, rotate,
  });
}

function addCell(slide: Slide, x: number, y: number, w: number, h: number, text: string,
  options: { fill?: string; bold?: boolean; align?: 'left' | 'center'; fontSize?: number } = {}): void {
  addRect(slide, x, y, w, h, options.fill ?? WHITE);
  addText(slide, text, x + 2.3, y + 1.1, w - 4.6, h - 2.2, {
    bold: options.bold ?? false,
    align: options.align ?? 'left',
    fontSize: options.fontSize ?? 11,
  });
}

function addBand(slide: Slide, logoData: string, title = 'INFORMATIONS ADMINISTRATIVES'): void {
  addImage(slide, logoData, 15, 2.7, 62.4, 16.5, 'contain', 'Logo France Verte');
  addRule(slide, 15, 22.1, 180.1, 9.3, GREEN);
  addText(slide, title, 18, 22.7, 174, 8.1, {
    fontSize: 15.8, color: WHITE, bold: true, align: 'center',
  });
}

function addFooter(slide: Slide, data: Part1ReportData, page: number): void {
  addText(slide, `Copropriété ${requiredText(data.copropriete.nom)}`,
    62, 284.5, 86, 5, { fontSize: 9.5, align: 'center', color: MUTED });
  addText(slide, String(page), 171.5, 284.5, 7, 5,
    { fontSize: 9.5, align: 'right', color: MUTED });
}

function setA4Layout(pptx: pptxgen): void {
  pptx.defineLayout({ name: 'PPPT_A4_PORTRAIT', width: PART1_A4.width, height: PART1_A4.height });
  pptx.layout = 'PPPT_A4_PORTRAIT';
}

function addCover(pptx: pptxgen, data: Part1ReportData, assets: Part1PresentationAssets): Slide {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };

  addImage(slide, assets.coverBlueCornerData, 0, 19, 27.2, 59.7, 'contain', 'Décor bleu France Verte');
  addImage(slide, assets.coverYellowCornerData, 184.9, 227, 27.3, 54.0,
    'contain', 'Décor jaune France Verte', 356);
  addImage(slide, assets.logoData, 13.7, 2.7, 62.4, 16.5, 'contain', 'Logo France Verte');
  addImage(slide, assets.rgeLogoData, 155, 3.4, 25, 16.5, 'contain', 'Logo RGE OPQIBI du modèle');
  addRule(slide, 13.5, 27.1, 181.0, 0.65, YELLOW);
  addRule(slide, 194.8, 30.1, 0.62, 201.7, '24C879');
  addRule(slide, 14.0, 68, 0.62, 209.0, YELLOW);
  addRule(slide, 18.0, 277.2, 172.5, 0.68, BLUE);

  addText(slide, 'PPPT', 58, 35, 94, 10, { fontSize: 28, color: BLUE, bold: true, align: 'center' });
  addText(slide, 'Projet de Plan Pluriannuel de Travaux', 31, 46, 148, 8,
    { fontSize: 18, color: BLUE, bold: true, align: 'center' });
  addText(slide, 'Bureau d’études thermiques et fluides', 40, 59.5, 130, 7.5,
    { fontSize: 13, bold: true, align: 'center' });

  addText(slide, 'FRANCE VERTE', 17.3, 72, 80, 5, { bold: true, fontSize: 10.8 });
  addText(slide, `E-mail : ${FRANCE_VERTE.email}`, 17.3, 79, 110, 5, { fontSize: 10.5 });
  addText(slide, `Téléphone : ${FRANCE_VERTE.telephone}`, 17.3, 86, 110, 5, { fontSize: 10.5 });
  addText(slide, 'Adresse : 22 Avenue Barthélémy Thimonnier,\n69300 Caluire-et-Cuire', 17.3, 93, 125, 9,
    { fontSize: 10.5, valign: 'top' });

  addText(slide, `Copropriété ${requiredText(data.copropriete.nom)}`, 32.8, 105.4, 144, 7.3,
    { fontSize: 12.4, bold: true, align: 'center' });
  addText(slide, `Adresse : ${requiredText(data.copropriete.adresse)}`, 32.8, 112.8, 144, 7.4,
    { fontSize: 11, align: 'center' });
  addImage(slide, assets.visuals.photo_principale_copropriete.data,
    32.4, 124.6, 145, 89.2, 'cover', 'Photographie principale de la copropriété');

  addText(slide, [
    { text: 'Date de visite : ', options: { bold: true } },
    { text: requiredText(data.rapport.dateVisite) },
  ], 35, 217.7, 105, 6.5,
    { fontSize: 11.3 });
  addText(slide, [
    { text: 'Date du rapport : ', options: { bold: true } },
    { text: requiredText(data.rapport.dateRapport) },
  ], 35, 224.7, 105, 6.5,
    { fontSize: 11.3 });
  addText(slide, [
    { text: 'Version du rapport : ', options: { bold: true } },
    { text: requiredText(data.rapport.version) },
  ], 35, 231.7, 105, 6.5,
    { fontSize: 11.3 });
  addImage(slide, assets.stampData, 139.5, 222.5, 47.9, 14.9, 'contain', 'Tampon France Verte du modèle');

  addText(slide, [
    { text: 'Mission réalisée pour la copropriété ' },
    { text: requiredText(data.copropriete.nom), options: { bold: true } },
    { text: ', représentée par son syndic, ' },
    { text: requiredText(data.donneurOrdre.nom), options: { bold: true } },
  ],
    38, 253, 134, 15.0, { fontSize: 11.2, align: 'center', valign: 'middle' });
  addText(slide,
    'Le présent rapport forme un ensemble indivisible. Il ne peut être interprété ou diffusé partiellement et doit être communiqué dans son intégralité.',
    26, 282.5, 158, 11.0, { fontSize: 9.6, align: 'center' });
  return slide;
}

function addAdministrativePage(pptx: pptxgen, data: Part1ReportData,
  assets: Part1PresentationAssets): Slide {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addBand(slide, assets.logoData);

  addCell(slide, 15, 34.3, 180.1, 9.2, 'Désignation du donneur d’ordre', { fill: GRAY, bold: true });
  addCell(slide, 15, 43.5, 180.1, 9.2, `Nom : ${requiredText(data.donneurOrdre.nom)}`);
  addCell(slide, 15, 52.7, 180.1, 9.2, `Adresse : ${requiredText(data.donneurOrdre.adresse)}`);

  addCell(slide, 15, 68.3, 90.0, 9.2, 'Désignation du chargé de projet', { fill: GRAY, bold: true });
  addCell(slide, 105, 68.3, 90.1, 9.2, 'Vérificateur', { fill: GRAY, bold: true });
  addCell(slide, 15, 77.5, 90.0, 9.2, `Nom : ${requiredText(data.equipe.chargeProjet.nom)}`);
  addCell(slide, 105, 77.5, 90.1, 9.2, `Nom : ${requiredText(data.equipe.verificateur.nom)}`);
  addCell(slide, 15, 86.7, 90.0, 11.5, `Poste : ${requiredText(data.equipe.chargeProjet.fonction)}`);
  addCell(slide, 105, 86.7, 90.1, 11.5, `Poste : ${requiredText(data.equipe.verificateur.fonction)}`);
  addCell(slide, 15, 98.2, 180.1, 9.2, 'Intervenant sur site', { fill: GRAY, bold: true });
  addCell(slide, 15, 107.4, 180.1, 9.2, `Nom : ${requiredText(data.equipe.intervenantSite.nom)}`);

  addCell(slide, 15, 123, 180.1, 9.2, 'Emetteur du rapport', { fill: GRAY, bold: true });
  addCell(slide, 15, 132.2, 180.1, 9.2, 'Raison sociale : SAS France Verte');
  addCell(slide, 15, 141.4, 180.1, 9.2, `Adresse : ${FRANCE_VERTE.adresse}`);
  addCell(slide, 15, 150.6, 180.1, 9.2, `Contact : ${FRANCE_VERTE.email} / ${FRANCE_VERTE.telephone}`);
  addCell(slide, 15, 159.8, 180.1, 9.2, `Site internet : ${FRANCE_VERTE.site}`);

  addCell(slide, 15, 175, 180.1, 9.2, 'Localisation de la copropriété', { fill: GRAY, bold: true });
  addCell(slide, 15, 184.2, 90.0, 9.3, `Adresse : ${requiredText(data.copropriete.adresse)}`);
  addCell(slide, 105, 184.2, 90.1, 9.3, `Référence cadastrale : ${requiredText(data.cadastre.reference)}`);
  addRect(slide, 15, 193.5, 180.1, 86.4);
  addImage(slide, assets.visuals.extrait_cadastral.data, 51.2, 198.7, 110, 70,
    'contain', 'Extrait cadastral fourni pour la copropriété');
  return slide;
}

function addBuildingPage(pptx: pptxgen, data: Part1ReportData,
  assets: Part1PresentationAssets): Slide {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addBand(slide, assets.logoData);
  addText(slide, 'Description de la copropriété :', 17.3, 38, 175, 7, { fontSize: 12, bold: true });

  addCell(slide, 15, 52.2, 180.1, 9.0, `Résidence ${requiredText(data.copropriete.nom)}`,
    { fill: GRAY, bold: true, align: 'center' });
  addCell(slide, 15, 61.2, 45, 9.2, 'Adresse du site', { fill: GRAY, bold: true });
  addCell(slide, 60, 61.2, 135.1, 9.2, requiredText(data.copropriete.adresse));

  const detailRows: readonly [string, string, string, string][] = [
    ['Année de construction', requiredText(data.batiment.periodeConstruction),
      'Date du règlement de copropriété', requiredText(data.batiment.dateReglementCopropriete)],
    ["Date d’immatriculation", requiredText(data.batiment.dateImmatriculation),
      "Numéro d’immatriculation", requiredText(data.batiment.numeroImmatriculation)],
  ];
  detailRows.forEach((row, index) => {
    const y = 70.4 + index * 11.7;
    addCell(slide, 15, y, 45, 11.7, row[0], { fill: GRAY, bold: true });
    addCell(slide, 60, y, 45, 11.7, row[1], { align: 'center' });
    addCell(slide, 105, y, 43.5, 11.7, row[2], { fill: GRAY, bold: true });
    addCell(slide, 148.5, y, 46.6, 11.7, row[3], { align: 'center' });
  });

  const buildingRows: readonly [string, string, string, string][] = [
    ['Nombre de bâtiments', numericText(data.batiment.nombreBatiments),
      "Nombre d’entrées", numericText(data.batiment.nombreEntrees)],
    ['Nombre total de lots', numericText(data.batiment.nombreLots),
      'Nombre de niveaux', numericText(data.batiment.nombreNiveaux)],
    ['Nombre total de lots principaux', numericText(data.batiment.nombreLotsPrincipaux),
      'Type de chauffage', requiredText(data.batiment.typeChauffage)],
    ["Nombre total de lots à usage d’habitation", numericText(data.batiment.nombreLotsHabitation),
      "Nombre d’ascenseurs", numericText(data.batiment.nombreAscenseurs)],
    ['SHAB approximative', `${numericText(data.batiment.shabApproximative)} m²`,
      'Altitude', `${numericText(data.batiment.altitude)} m`],
  ];
  buildingRows.forEach((row, index) => {
    const y = 103 + index * 11.2;
    addCell(slide, 15, y, 45, 11.2, row[0], { fill: GRAY, bold: true, fontSize: 10 });
    addCell(slide, 60, y, 45, 11.2, row[1], { align: 'center' });
    addCell(slide, 105, y, 43.5, 11.2, row[2], { fill: GRAY, bold: true, fontSize: 10 });
    addCell(slide, 148.5, y, 46.6, 11.2, row[3], { align: 'center' });
  });
  addImage(slide, assets.visuals.vue_aerienne_rapprochee.data,
    15, 170.5, 180, 100, 'contain', 'Vue aérienne rapprochée de la copropriété');
  return slide;
}

function heritageText(status: StatutPatrimonial | null): string {
  return status === 'concerne' ? 'Concerné' : 'Non concerné';
}

function addHeritagePage(pptx: pptxgen, data: Part1ReportData,
  assets: Part1PresentationAssets): Slide {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addBand(slide, assets.logoData);
  addText(slide, 'Statut patrimonial du bâtiment :', 17.5, 35.5, 175, 6,
    { fontSize: 12.3, bold: true });
  addText(slide,
    "Le statut patrimonial d'un bâtiment peut avoir une incidence sur les travaux de rénovation énergétique, notamment lorsqu'ils modifient l'aspect extérieur de l'immeuble (isolation thermique par l'extérieur, remplacement des menuiseries, réfection de toiture, installation de panneaux solaires, etc.). Dans un secteur protégé, certains travaux peuvent nécessiter des autorisations spécifiques ou l'avis de l'Architecte des Bâtiments de France (ABF).",
    17.5, 45, 175, 27, { fontSize: 11, valign: 'top', breakLine: false });

  const x = [15, 46.5, 107, 195.1];
  const columnWidths = [31.5, 60.5, 88.1];
  const headerY = 80.8;
  const headerH = 12;
  ['Statut patrimonial', 'Description', 'Conséquences sur les travaux'].forEach((label, index) =>
    addCell(slide, x[index], headerY, columnWidths[index], headerH, label,
      { bold: true, align: 'center', fontSize: 10.5 }));

  const entries = [
    {
      y: 92.8, h: 18.8,
      name: 'Aucun périmètre de protection',
      description: "L'immeuble n'est soumis à aucune protection patrimoniale particulière.",
      consequence: "Les travaux peuvent être réalisés dans le respect des règles d'urbanisme en vigueur, sans contrainte patrimoniale spécifique.",
    },
    {
      y: 111.6, h: 29.5,
      name: 'Site patrimonial remarquable',
      description: "Secteur présentant un intérêt historique, architectural ou paysager bénéficiant d'une protection particulière.",
      consequence: "Les travaux modifiant l'aspect extérieur du bâtiment (façades, toiture, menuiseries, isolation par l'extérieur, etc.) sont soumis à des prescriptions architecturales et peuvent nécessiter l'accord de l'Architecte des Bâtiments de France (ABF).",
    },
    {
      y: 141.1, h: 33.8,
      name: "Abords d'un Monument Historique",
      description: "L'immeuble est situé dans un périmètre de 500 mètres autour d'un monument historique classé ou inscrit et est susceptible d'être visible depuis celui-ci ou visible en même temps que celui-ci.",
      consequence: "Les travaux visibles depuis l'espace public sont susceptibles d'être soumis à l'avis conforme de l'Architecte des Bâtiments de France (ABF). Des prescriptions concernant les matériaux, les couleurs ou l'aspect des ouvrages peuvent être imposées.",
    },
  ] as const;
  entries.forEach((entry) => {
    addCell(slide, x[0], entry.y, columnWidths[0], entry.h, entry.name,
      { bold: true, align: 'center', fontSize: 11 });
    addCell(slide, x[1], entry.y, columnWidths[1], entry.h, entry.description,
      { fontSize: 11 });
    addCell(slide, x[2], entry.y, columnWidths[2], entry.h, entry.consequence,
      { fontSize: 11 });
  });

  addRect(slide, 15, 174.9, 180.1, 105);
  addText(slide, 'Votre situation :', 17.5, 178.5, 65, 6, { bold: true, fontSize: 11.3 });
  const heritageRows: readonly [string, StatutPatrimonial | null][] = [
    ['Aucun périmètre de protection', data.patrimoine.aucunPerimetreProtection],
    ['Site patrimonial remarquable', data.patrimoine.sitePatrimonialRemarquable],
    ["Abords d'un monument historique", data.patrimoine.abordsMonumentHistorique],
  ];
  heritageRows.forEach(([label, status], index) => {
    const y = 187.5 + index * 18.5;
    addText(slide, `•  ${label}`, 17.5, y, 65, 7.3, { fontSize: 11 });
    addText(slide, heritageText(status), 17.5, y + 7.4, status === 'concerne' ? 20 : 28, 6.7,
      { fontSize: 11, bold: true, color: status === 'concerne' ? '009B55' : 'D52234',
        fill: { color: 'FFF176' } });
  });
  addImage(slide, assets.visuals.vue_patrimoniale.data,
    86.7, 178.8, 104.1, 84.7, 'contain', 'Vue patrimoniale fournie pour la copropriété');
  return slide;
}

function validateAssets(assets: Part1PresentationAssets): void {
  const fixed = [assets.logoData, assets.coverBlueCornerData, assets.coverYellowCornerData,
    assets.rgeLogoData, assets.stampData];
  if (fixed.some((data) => !data?.startsWith('data:image/'))) {
    throw new Error('Un élément graphique fixe de la Partie 1 est indisponible.');
  }
  for (const role of ROLES_VISUELS_PARTIE1) {
    const visual = assets.visuals[role];
    if (!visual?.data.startsWith('data:image/') || !Number.isFinite(visual.width)
      || !Number.isFinite(visual.height) || visual.width <= 0 || visual.height <= 0) {
      throw new Error(`Le visuel ${role} ne peut pas être inséré dans le rapport.`);
    }
  }
}

/**
 * Adds the first four pages to an existing presentation. It does not write a
 * separate PPTX, allowing the later report composer to finalize all page
 * references after the Part 2 slides have been appended.
 */
export function appendPart1AdministrativeSlides(
  pptx: pptxgen,
  data: Part1ReportData,
  assets: Part1PresentationAssets,
): Part1AdministrativeSlides {
  const validation = validatePart1ReportData(data);
  if (!validation.isValid) {
    throw new Error(`Partie 1 incomplète : ${validation.issues[0].message}`);
  }
  validateAssets(assets);
  setA4Layout(pptx);
  const slides: [Slide, Slide, Slide, Slide] = [
    addCover(pptx, data, assets),
    addAdministrativePage(pptx, data, assets),
    addBuildingPage(pptx, data, assets),
    addHeritagePage(pptx, data, assets),
  ];
  let finalized = false;
  return {
    slides,
    finalize({ totalPages, firstPageNumber }) {
      if (finalized) throw new Error('La pagination de la Partie 1 est déjà finalisée.');
      if (!Number.isInteger(firstPageNumber) || firstPageNumber < 1
        || !Number.isInteger(totalPages) || totalPages < firstPageNumber + 3) {
        throw new Error('La pagination du rapport est invalide.');
      }
      addText(slides[0], `Ce rapport contient : ${totalPages} pages`, 35, 238.7, 105, 6.4,
        { fontSize: 11.3 });
      for (let index = 1; index < slides.length; index += 1) {
        addFooter(slides[index], data, firstPageNumber + index);
      }
      finalized = true;
    },
  };
}

function assertReadyForSection(data: Part1ReportData, logoData: string, firstPageNumber: number): void {
  const validation = validatePart1ReportData(data);
  if (!validation.isValid) throw new Error(`Partie 1 incomplète : ${validation.issues[0].message}`);
  if (!logoData.startsWith('data:image/')) throw new Error('Logo France Verte indisponible.');
  if (!Number.isInteger(firstPageNumber) || firstPageNumber < 1) {
    throw new Error('Numéro de page de la Partie 1 invalide.');
  }
}

function addSectionPage(pptx: pptxgen, logoData: string, title: string): Slide {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  addBand(slide, logoData, title);
  return slide;
}

/**
 * Builds the Part 1 portion of the dynamic contents page. Entries for later
 * sections are intentionally supplied by the eventual report composer: it is
 * the only component that will know which Part 2 priority sections exist and
 * where their rendered slides begin.
 */
export function planPart1Contents(
  firstContentsPageNumber: number,
  laterEntries: readonly Part1ContentsEntry[] = [],
): Part1ContentsPlan {
  if (!Number.isInteger(firstContentsPageNumber) || firstContentsPageNumber < 1) {
    throw new Error('Numéro de première page du sommaire invalide.');
  }
  const pageCount = Math.ceil((2 + PART1_INTRODUCTION_CONTENTS.length + laterEntries.length)
    / CONTENTS_ROWS_PER_PAGE);
  const firstIntroductionPage = firstContentsPageNumber + pageCount;
  const entries: Part1ContentsEntry[] = [
    { label: 'Informations administratives', page: 2, level: 0 },
    { label: '1. Introduction', page: firstIntroductionPage, level: 0 },
    ...PART1_INTRODUCTION_CONTENTS.map((label, index): Part1ContentsEntry => ({
      label,
      page: firstIntroductionPage + (index === 0 ? 0 : index <= 2 ? 1 : 2),
      level: 1,
    })),
    ...laterEntries,
  ];
  return { entries, pageCount, firstIntroductionPage };
}

function validateContentsEntries(entries: readonly Part1ContentsEntry[]): void {
  if (entries.length === 0 || entries.some(({ label, page, level }) =>
    !label.trim() || !Number.isInteger(page) || page < 1 || (level !== 0 && level !== 1))) {
    throw new Error('Entrées du sommaire invalides.');
  }
}

/** Reserve contents pages before Part 2 is rendered; fill their real page references afterwards. */
export function reservePart1ContentsSlides(
  pptx: pptxgen,
  data: Part1ReportData,
  logoData: string,
  entryCount: number,
  firstPageNumber: number,
): ReservedPart1Contents {
  assertReadyForSection(data, logoData, firstPageNumber);
  if (!Number.isInteger(entryCount) || entryCount < 1) throw new Error('Nombre d’entrées du sommaire invalide.');
  setA4Layout(pptx);
  const slides: Slide[] = [];
  for (let start = 0; start < entryCount; start += CONTENTS_ROWS_PER_PAGE) {
    const slide = addSectionPage(pptx, logoData, 'SOMMAIRE');
    addFooter(slide, data, firstPageNumber + slides.length);
    slides.push(slide);
  }
  let finalized = false;
  return {
    slides,
    finalize(entries) {
      if (finalized) throw new Error('Le sommaire est déjà finalisé.');
      validateContentsEntries(entries);
      if (entries.length !== entryCount) throw new Error('Le nombre d’entrées du sommaire a changé.');
      slides.forEach((slide, pageIndex) => {
        const pageEntries = entries.slice(pageIndex * CONTENTS_ROWS_PER_PAGE,
          (pageIndex + 1) * CONTENTS_ROWS_PER_PAGE);
        pageEntries.forEach(({ label, page, level }, index) => {
          const x = level === 0 ? 17.5 : 22.5;
          const y = 40.8 + index * 10.45;
          const fontSize = level === 0 ? 11.6 : 10.9;
          const leaderStart = Math.min(177, x + label.length * (level === 0 ? 2.0 : 1.82) + 3);
          if (leaderStart < 181) slide.addShape('line', {
            x: mm(leaderStart), y: mm(y + 5.5), w: mm(181 - leaderStart), h: 0,
            line: { color: INK, width: 0.9, dashType: 'sysDot' },
          });
          addText(slide, label.trim(), x, y, Math.min(164, leaderStart - x), 7.3,
            { bold: level === 0, fontSize, valign: 'middle' });
          addText(slide, String(page), 183.2, y, 9.5, 7.3,
            { fontSize, bold: level === 0, align: 'right' });
        });
      });
      finalized = true;
    },
  };
}

/** Contents contain Part 1 entries plus only the later entries supplied by the composer. */
export function appendPart1ContentsSlides(
  pptx: pptxgen,
  data: Part1ReportData,
  logoData: string,
  entries: readonly Part1ContentsEntry[],
  firstPageNumber: number,
): Slide[] {
  validateContentsEntries(entries);
  const reserved = reservePart1ContentsSlides(pptx, data, logoData, entries.length, firstPageNumber);
  reserved.finalize(entries);
  return reserved.slides;
}

type IntroductionTextOptions = NonNullable<Parameters<Slide['addText']>[1]>;

interface IntroductionTextRun {
  text: string;
  options: IntroductionTextOptions;
}

interface IntroductionTextPart {
  text: string;
  options?: IntroductionTextOptions;
}

// PptxGenJS text boxes store this tuple as [left, right, bottom, top].
// These are the native PowerPoint "Normal" margins used by the reference deck.
const INTRODUCTION_TEXT_MARGINS: [number, number, number, number] = [7, 7, 3.5, 3.5];
const INTRODUCTION_BULLET_INDENT = 11.84;

function introductionParagraph(text: string, options: IntroductionTextOptions = {}): IntroductionTextRun {
  return { text, options: { ...options, breakLine: true } };
}

function introductionBlank(): IntroductionTextRun {
  return introductionParagraph('');
}

function introductionRichParagraph(parts: readonly IntroductionTextPart[]): IntroductionTextRun[] {
  return parts.map((part, index) => ({
    text: part.text,
    options: { ...part.options, breakLine: index === parts.length - 1 },
  }));
}

/**
 * The reference PPT uses one editable, auto-sized text box per introduction
 * page. Keep the text flowing inside that box: fixed individual boxes caused
 * shrink-to-fit fonts and artificial vertical gaps in the exported report.
 */
function addIntroductionTextFlow(slide: Slide, text: IntroductionTextRun[],
  x: number, y: number, w: number, h: number, fit: 'none' | 'resize' = 'resize'): void {
  slide.addText(text, {
    x: mm(x), y: mm(y), w: mm(w), h: mm(h),
    fontFace: FONT, fontSize: 11, color: INK,
    margin: INTRODUCTION_TEXT_MARGINS,
    align: 'justify', valign: 'top', fit, wrap: true,
  });
}

function addIntroductionFramework(slide: Slide): void {
  const heading: IntroductionTextOptions = { fontSize: 13, bold: true };
  const bullet: IntroductionTextOptions = {
    bullet: { characterCode: '2022', indent: INTRODUCTION_BULLET_INDENT },
  };
  addIntroductionTextFlow(slide, [
    introductionParagraph('1.1 Cadre réglementaire du Projet de Plan Pluriannuel de Travaux (PPPT)', heading),
    introductionBlank(),
    ...introductionRichParagraph([
      { text: 'Le présent document constitue un ' },
      { text: 'Projet de Plan Pluriannuel de Travaux (PPPT)', options: { bold: true } },
      { text: ' établi conformément aux dispositions de la ' },
      { text: 'loi n° 2021-1104 du 22 août 2021', options: { bold: true } },
      { text: ', dite « Climat et Résilience », codifiées aux ' },
      { text: 'articles L.731-1 à L.731-5', options: { bold: true } },
      { text: ' et ' },
      { text: "R.731-1 à R.731-3 du Code de la construction et de l'habitation", options: { bold: true } },
      { text: ", ainsi qu'à " },
      { text: "l'arrêté du 30 mars 2022 relatif au contenu du Projet de Plan Pluriannuel de Travaux", options: { bold: true } },
      { text: '.' },
    ]),
    introductionBlank(),
    introductionParagraph('Le PPPT est obligatoire pour les copropriétés de plus de 15 ans soumises au statut de la copropriété. Il a pour objectif d’anticiper les besoins de travaux sur les parties communes et les équipements collectifs de l’immeuble, de planifier leur réalisation sur une période de dix ans et d’en estimer les coûts prévisionnels.'),
    introductionBlank(),
    introductionParagraph('Son élaboration repose sur l’analyse de l’état apparent du bâti, des équipements communs et des informations communiquées par le syndicat des copropriétaires ou son représentant. Elle prend également en compte le Diagnostic de Performance Énergétique (DPE) collectif et, lorsqu’il existe, le Diagnostic Technique Global (DTG).'),
    introductionBlank(),
    introductionParagraph('Le PPPT répond à trois objectifs majeurs :'),
    introductionParagraph('Assurer la conservation et la pérennité du patrimoine immobilier ;', bullet),
    introductionParagraph('Garantir la sécurité et le confort des occupants ;', bullet),
    introductionParagraph('Favoriser l’amélioration de la performance énergétique du bâtiment.', bullet),
    introductionBlank(),
    introductionParagraph('Le projet présenté dans ce rapport constitue un outil d’aide à la décision permettant à la copropriété d’identifier les travaux à prévoir, de hiérarchiser les interventions et d’anticiper les investissements futurs.'),
    introductionBlank(),
    ...introductionRichParagraph([
      { text: 'Après sa présentation en assemblée générale, le PPPT pourra être adopté en tout ou partie par les copropriétaires. Une fois approuvé, il devient un ' },
      { text: 'Plan Pluriannuel de Travaux (PPT)', options: { bold: true } },
      { text: ' et sert de référence pour la programmation des opérations à venir. Les travaux sont ensuite soumis au vote des copropriétaires selon les règles de majorité applicables à leur nature.' },
    ]),
    introductionBlank(),
    introductionParagraph('Conformément à la réglementation en vigueur, l’adoption d’un PPT entraîne également l’obligation de constituer ou d’alimenter le fonds de travaux de la copropriété afin de financer progressivement les opérations programmées.'),
    introductionBlank(),
    introductionParagraph('Il est rappelé que le PPPT constitue un document prévisionnel et évolutif. Il a vocation à être actualisé périodiquement afin de tenir compte de l’évolution de l’état du bâtiment, des obligations réglementaires et des décisions prises par le syndicat des copropriétaires.'),
    introductionBlank(),
    introductionParagraph('Dans le cadre de l’exercice de ses pouvoirs de contrôle en matière de sécurité et de salubrité des immeubles, l’autorité administrative compétente peut demander à tout moment la transmission du Plan Pluriannuel de Travaux (PPT) adopté par la copropriété. En l’absence de transmission dans un délai d’un mois suivant cette demande, ou lorsque le document transmis ne prévoit manifestement pas les travaux nécessaires à la préservation de la sécurité des occupants et à la conservation de l’immeuble, l’autorité administrative peut faire élaborer ou actualiser d’office le projet de plan pluriannuel de travaux, aux frais du syndicat des copropriétaires.'),
    introductionBlank(),
    introductionParagraph('Par ailleurs, le non-respect des obligations relatives à l’élaboration du PPPT est susceptible d’engager la responsabilité du syndicat des copropriétaires. Les copropriétaires estimant avoir subi un préjudice du fait de l’absence de réalisation du PPPT peuvent solliciter réparation conformément aux dispositions de l’article 14 de la loi du 10 juillet 1965.'),
  ], 15.03, 35.69, 180.13, 229.67);
}

function addIntroductionScope(slide: Slide): void {
  const heading: IntroductionTextOptions = { fontSize: 13, bold: true };
  const subheading: IntroductionTextOptions = {
    underline: { style: 'sng', color: INK },
  };
  const bullet: IntroductionTextOptions = {
    bullet: { characterCode: '2022', indent: INTRODUCTION_BULLET_INDENT },
  };
  addIntroductionTextFlow(slide, [
    introductionParagraph('1.2 Validité du présent rapport', heading),
    introductionBlank(),
    introductionParagraph("Les constats et observations présentés dans ce rapport sont établis sur la base des éléments visibles et accessibles au jour de la visite. Ils reflètent l'état apparent de l'immeuble à cette date uniquement."),
    introductionBlank(),
    introductionParagraph("Toute modification, intervention ou dégradation survenue postérieurement à notre passage ne peut être prise en compte dans la présente étude. L'évolution naturelle du bâtiment, les conditions climatiques, les sinistres, les travaux ou tout autre événement susceptible d'affecter son état peuvent entraîner l'apparition ou l'aggravation de désordres non observables lors de la visite."),
    introductionBlank(),
    introductionParagraph('En conséquence, les conclusions du présent rapport doivent être appréciées au regard de la date de réalisation de la mission.'),
    introductionBlank(),
    introductionBlank(),
    introductionParagraph('1.3 Périmètre de la mission et réserves', heading),
    introductionBlank(),
    introductionParagraph('Nature de la mission', subheading),
    introductionParagraph("La présente mission consiste en une analyse visuelle de l'état apparent des parties communes et des équipements collectifs de la copropriété. Elle vise à identifier les principales pathologies, désordres, défauts d'entretien ou besoins de travaux susceptibles d'affecter la conservation du bâtiment, la sécurité des occupants ou la performance énergétique de l'immeuble."),
    introductionBlank(),
    introductionParagraph('Cette mission est réalisée sans sondage, démontage, essai destructif ou investigation intrusive.'),
    introductionBlank(),
    introductionParagraph('Sources d’information', subheading),
    introductionParagraph("Les observations et préconisations formulées dans ce rapport s'appuient :"),
    introductionParagraph('sur les documents et informations transmis par le syndicat des copropriétaires ou son représentant ;', bullet),
    introductionParagraph('sur les constatations réalisées lors de la visite des lieux ;', bullet),
    introductionParagraph("sur les éléments visibles et accessibles au moment de l'intervention.", bullet),
    introductionBlank(),
    introductionParagraph("Les conclusions présentées ne peuvent donc être considérées comme exhaustives et demeurent limitées aux conditions d'observation rencontrées lors de la visite."),
    introductionBlank(),
    introductionParagraph('Éléments non visités ou non accessibles', subheading),
    introductionParagraph("Sauf mention contraire, les éléments suivants n'ont pas pu être inspectés ou ont fait l'objet d'une observation limitée :"),
    introductionParagraph("les locaux nécessitant un accès spécifique ou l'accompagnement d'une personne habilitée (chaufferie, machinerie d'ascenseur, locaux techniques, postes de transformation, etc.) ;", bullet),
    introductionParagraph("les ouvrages situés à plus de 3 mètres de hauteur lorsqu'aucun moyen d'accès adapté n'était disponible ;", bullet),
    introductionParagraph('les combles perdus, vides sanitaires, volumes confinés ou zones rendues inaccessibles ;', bullet),
    introductionParagraph('les réseaux, canalisations, gaines techniques et structures non visibles ;', bullet),
    introductionParagraph("les éléments situés sous les complexes d'étanchéité ou d'isolation ;", bullet),
    introductionParagraph("les parties dont l'accès présentait un risque pour la sécurité des intervenants.", bullet),
    introductionBlank(),
    introductionParagraph('Les éventuels désordres affectant ces ouvrages ne peuvent donc être identifiés dans le cadre de la présente mission.'),
  ], 15.03, 37.25, 180.13, 227.46);
}

interface IntroductionPriorityRow {
  displayLabel: string;
  fill: string;
  title: string;
  detail: string;
  horizonTitle?: string;
  horizonDetail: string;
  height: number;
  gapAfter?: number;
}

const INTRO_PRIORITY_ROWS: readonly IntroductionPriorityRow[] = [
  { displayLabel: 'Entretien', fill: '5DCCCC', title: 'Entretien',
    detail: "Opérations d'entretien courant et de maintenance préventive nécessaires au maintien en bon état des équipements et du bâtiment.",
    horizonDetail: 'Hors PPPT\n(à titre informatif)', height: 22.11, },
  { displayLabel: 'Signalement', fill: '006FC0', title: 'Signalements',
    detail: "Observations et points de vigilance relevés lors de la visite principalement dans les parties privatives. Ces éléments sont présentés à titre informatif afin d'attirer l'attention des copropriétaires.",
    horizonDetail: 'Hors PPPT\n(à titre informatif)', height: 26.17, gapAfter: 6.68 },
  { displayLabel: 'Curatif Niveau 1', fill: 'D02334', title: 'Travaux prioritaires',
    detail: 'Interventions urgentes nécessaires à la sécurité des occupants, à la préservation du bâti ou à la continuité de service des équipements.',
    horizonTitle: 'Travaux à effectuer', horizonDetail: 'Sous 2 ans', height: 22.41 },
  { displayLabel: 'Curatif Niveau 2', fill: 'E96620', title: 'Travaux à moyen terme',
    detail: "Travaux correctifs à programmer afin d'éviter une dégradation progressive du bâtiment ou des équipements.",
    horizonTitle: 'Travaux à effectuer', horizonDetail: 'Entre 3 et 5 ans', height: 20.42 },
  { displayLabel: 'Curatif Niveau 3', fill: '04CC7E', title: 'Travaux d’esthétiques',
    detail: "Travaux de rénovation ou d'embellissement ne présentant pas de caractère urgent mais contribuant à l'amélioration de l'aspect esthétique.",
    horizonTitle: 'Travaux à effectuer', horizonDetail: 'Entre 6 et 10 ans', height: 21.83, gapAfter: 6.68 },
  { displayLabel: 'Travaux\nénergétiques', fill: '4EA72E', title: 'Travaux énergétiques',
    detail: "Travaux visant à améliorer la performance énergétique du bâtiment, réduire les consommations d'énergie et améliorer le confort thermique des occupants.",
    horizonDetail: 'Selon la stratégie de\nrénovation retenue', height: 24.87 },
];

function addIntroductionPriorities(slide: Slide): void {
  const heading: IntroductionTextOptions = { fontSize: 13, bold: true };
  addIntroductionTextFlow(slide, [
    introductionParagraph('1.4 Limite de la mission', heading),
    introductionBlank(),
    introductionParagraph("La présente étude constitue un outil d'aide à la décision reposant principalement sur une inspection visuelle des parties communes et des équipements collectifs accessibles lors de la visite. Elle ne saurait être assimilée à une expertise technique approfondie, une mission de maîtrise d'œuvre ou une étude d'exécution."),
    introductionBlank(),
    introductionParagraph('Les estimations financières présentées ont un caractère indicatif et visent uniquement à hiérarchiser les interventions. Les préconisations formulées pourront nécessiter des investigations complémentaires réalisées par des professionnels spécialisés avant toute réalisation de travaux.'),
    introductionBlank(),
    introductionParagraph("FRANCE VERTE décline toute responsabilité en cas d'utilisation du présent document en dehors de son objet, de son périmètre d'intervention."),
    introductionBlank(),
    introductionParagraph('1.5 Hiérarchisation des travaux et des observations', heading),
  ], 15.03, 33.43, 180.13, 74.94, 'none');

  const tableX = 15.03;
  const tableColumns = [46.71, 93.13, 40.29] as const;
  const chevronX = 19.235;
  const chevronWidth = 39.21;
  const chevronHeight = 13.92;
  let y = 116.53;
  INTRO_PRIORITY_ROWS.forEach((row) => {
    const secondColumnX = tableX + tableColumns[0];
    const thirdColumnX = secondColumnX + tableColumns[1];
    addRect(slide, tableX, y, tableColumns[0], row.height, WHITE, BORDER, 1);
    addRect(slide, secondColumnX, y, tableColumns[1], row.height, WHITE, BORDER, 1);
    addRect(slide, thirdColumnX, y, tableColumns[2], row.height, WHITE, BORDER, 1);
    slide.addShape('homePlate', {
      x: mm(chevronX), y: mm(y + (row.height - chevronHeight) / 2),
      w: mm(chevronWidth), h: mm(chevronHeight),
      line: { color: BORDER, width: 0.7 }, fill: { color: row.fill },
    });
    addText(slide, row.displayLabel, chevronX + 2.1, y + (row.height - 7.6) / 2,
      chevronWidth - 4.2, 7.6, { color: WHITE, bold: true, fontSize: 11.4, align: 'center' });
    addText(slide, [
      { text: row.title, options: { bold: true, align: 'center', breakLine: true } },
      { text: row.detail, options: { align: 'justify' } },
    ], secondColumnX + 2.2, y + 1.1, tableColumns[1] - 4.4, row.height - 2.2,
      { fontSize: 11, fit: 'none' });
    if (row.horizonTitle) {
      addText(slide, [
        { text: row.horizonTitle, options: { bold: true, align: 'center', breakLine: true } },
        { text: row.horizonDetail, options: { align: 'center' } },
      ], thirdColumnX + 1.8, y + 1.1, tableColumns[2] - 3.6, row.height - 2.2,
        { fontSize: 11, fit: 'none', align: 'center' });
    } else {
      addText(slide, row.horizonDetail, thirdColumnX + 1.8, y + 1.1,
        tableColumns[2] - 3.6, row.height - 2.2,
        { fontSize: 11, fit: 'none', align: 'center' });
    }
    y += row.height + (row.gapAfter ?? 0);
  });
}

/** Appends the three editable introduction pages after the contents pages. */
export function appendPart1IntroductionSlides(
  pptx: pptxgen,
  data: Part1ReportData,
  logoData: string,
  firstPageNumber: number,
): [Slide, Slide, Slide] {
  assertReadyForSection(data, logoData, firstPageNumber);
  setA4Layout(pptx);
  const slides: [Slide, Slide, Slide] = [
    addSectionPage(pptx, logoData, '1. INTRODUCTION'),
    addSectionPage(pptx, logoData, '1. INTRODUCTION'),
    addSectionPage(pptx, logoData, '1. INTRODUCTION'),
  ];
  addIntroductionFramework(slides[0]);
  addIntroductionScope(slides[1]);
  addIntroductionPriorities(slides[2]);
  slides.forEach((slide, index) => addFooter(slide, data, firstPageNumber + index));
  return slides;
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire un visuel de la Partie 1.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function fetchBrandImage(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Élément graphique France Verte indisponible : ${path}`);
  return readBlobAsDataUrl(await response.blob());
}

async function prepareVisual(file: File, preserveDetail: boolean): Promise<PreparedPart1Visual> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Le navigateur ne peut pas préparer les visuels du rapport.');
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return {
      data: preserveDetail ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.9),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    bitmap.close();
  }
}

/** Browser-side asset preparation; the Part 1 files never enter /api/analyze. */
export async function loadPart1PresentationAssets(data: Part1ReportData): Promise<Part1PresentationAssets> {
  const validation = validatePart1ReportData(data);
  if (!validation.isValid) throw new Error(`Partie 1 incomplète : ${validation.issues[0].message}`);
  const [logoData, coverBlueCornerData, coverYellowCornerData, rgeLogoData, stampData, ...prepared] =
    await Promise.all([
      fetchBrandImage('/france-verte-logo.png'),
      fetchBrandImage('/part1/cover-blue-corner.png'),
      fetchBrandImage('/part1/cover-yellow-corner.png'),
      fetchBrandImage('/part1/rge-opqibi.png'),
      fetchBrandImage('/part1/france-verte-stamp.png'),
      ...ROLES_VISUELS_PARTIE1.map((role) =>
        prepareVisual(data.visuels[role]!, role !== 'photo_principale_copropriete')),
    ]);
  const visuals = Object.fromEntries(
    ROLES_VISUELS_PARTIE1.map((role, index) => [role, prepared[index]]),
  ) as Record<RoleVisuelPartie1, PreparedPart1Visual>;
  return { logoData, coverBlueCornerData, coverYellowCornerData, rgeLogoData, stampData, visuals };
}
