import pptxgen from 'pptxgenjs';
import type { InspectionImageItem } from '../types';
import { normalizePptxPackage } from '../report/pptxPackageIntegrity';
import { buildPart3CurativeSummary, type NiveauCuratifPartie3, type RecapitulatifCuratifsPartie3 } from './curativeSummary';
import {
  LIBELLES_STATUTS_DOCUMENTAIRES_PARTIE3,
  type LigneDocumentairePartie3,
  type Part3ReportData,
  type RoleVisuelDpePartie3,
  type StatutDocumentairePartie3,
} from './reportData';
import { validatePart3ReportData } from './reportDataValidation';
import {
  PART3_SECTION_3_EVOLUTIONS_REGLEMENTAIRES,
  PART3_SECTION_4_RECOMMANDATIONS_COMPLEMENTAIRES,
  PART3_SECTION_5_ANALYSE_DOCUMENTAIRE,
  PART3_SECTION_6_SYNTHESE_PPPT,
  PART3_SECTION_7_CONCLUSION,
  PART3_SECTION_8_FINANCEMENTS_RENOVATION_ENERGETIQUE,
  PART3_SECTION_9_LEXIQUE,
  PART3_SECTIONS_10_ET_11,
  PART3_TABLEAUX_DOCUMENTAIRES_MODELE,
  PART3_VALEUR_A_CONFIRMER,
} from './part3StaticContent';

type Slide = ReturnType<pptxgen['addSlide']>;
type Text = Parameters<Slide['addText']>[0];

export const PART3_A4 = {
  width: 7559675 / 914400,
  height: 10691813 / 914400,
} as const;

export interface PreparedPart3Visual {
  data: string;
}

export interface Part3StaticPresentationAssets {
  defibrillatorData?: string;
  dpeClassDData?: string;
  dpeClassEData?: string;
  dpeClassFData?: string;
  dpeClassGData?: string;
  maPrimeRenovLogoData?: string;
  maPrimeRenovTableData?: string;
  ceeLogoData?: string;
  ecoPtzData?: string;
  tvaData?: string;
}

export interface Part3PresentationAssets {
  logoData: string;
  dpeVisuals: Partial<Record<RoleVisuelDpePartie3, PreparedPart3Visual>>;
  staticAssets?: Part3StaticPresentationAssets;
}

export interface Part3AppendOptions {
  /** Global page number assigned by the future report assembler. */
  firstPageNumber?: number;
  /** Raw copropriété name from the single Part 1 source of truth. */
  coproprieteName?: string;
}

export interface Part3ContentsEntry {
  label: string;
  page: number;
  level: 0 | 1;
}

/** A page-number-free outline used before the final report pagination exists. */
export interface Part3ContentsPlanEntry {
  label: string;
  level: 0 | 1;
}

export interface AppendedPart3Slides {
  slides: readonly Slide[];
  contents: readonly Part3ContentsEntry[];
  curativeSummary: RecapitulatifCuratifsPartie3;
}

// The reference deck uses Aptos for body copy and Aptos Display for headings.
// Keeping these choices local to Part 3 avoids changing the validated Part 2 renderer.
const FONT = 'Aptos';
const TITLE_FONT = 'Aptos Display';
const WHITE = 'FFFFFF';
const INK = '1C1C1C';
const GREEN = '00B55A';
const NAVY = '0A2B6B';
const LIGHT_GRAY = 'D9D9D9';
const MUTED = '6E7480';
const BORDER = '202020';
const STATUS_FILLS: Record<StatutDocumentairePartie3, string> = {
  transmis: '00B55A',
  non_transmis: 'FF0000',
  non_concerne: 'BFBFBF',
};
const CURATIVE_COLORS: Record<NiveauCuratifPartie3, string> = {
  'Curatif Niveau 1': 'D52234',
  'Curatif Niveau 2': 'F97316',
  'Curatif Niveau 3': '00BE84',
};
const mm = (value: number) => value / 25.4;

interface StaticRubric {
  titre: string;
  texte?: string;
  puces?: readonly string[];
  suite?: string;
  suitePuces?: readonly string[];
}

interface StaticEvolutionSlide {
  titre: string;
  sousTitre?: string;
  blocs?: readonly string[];
  puces?: readonly string[];
  aidesDisponibles?: string;
  secondSousTitre?: string;
  secondBlocs?: readonly string[];
  secondAidesDisponibles?: string;
  rubriques?: readonly StaticRubric[];
}

interface StaticFinanceSlide {
  titre: string;
  intro?: string;
  introduction?: string;
  rubriques?: readonly StaticRubric[];
  lien?: string;
  aides?: readonly string[];
  note?: string;
  etapes?: readonly (readonly [string, string])[];
}

function setA4Layout(pptx: pptxgen): void {
  pptx.defineLayout({ name: 'PPPT_PART3_A4_PORTRAIT', width: PART3_A4.width, height: PART3_A4.height });
  pptx.layout = 'PPPT_PART3_A4_PORTRAIT';
}

/** No shrink-to-fit: the caller allocates a box or creates a continuation page. */
function addText(
  slide: Slide,
  text: Text,
  x: number,
  y: number,
  w: number,
  h: number,
  options: Parameters<Slide['addText']>[1] = {},
): void {
  slide.addText(text, {
    x: mm(x), y: mm(y), w: mm(w), h: mm(h),
    fontFace: FONT,
    fontSize: 9,
    color: INK,
    margin: 0,
    breakLine: false,
    valign: 'top',
    wrap: true,
    ...options,
  });
}

function addRect(
  slide: Slide,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = WHITE,
  lineColor = BORDER,
  lineWidth = 0.55,
): void {
  slide.addShape('rect', {
    x: mm(x), y: mm(y), w: mm(w), h: mm(h),
    line: { color: lineColor, width: lineWidth },
    fill: { color: fill },
  });
}

function addRule(slide: Slide, x: number, y: number, w: number, h: number, color: string): void {
  slide.addShape('rect', {
    x: mm(x), y: mm(y), w: mm(w), h: mm(h),
    line: { color, transparency: 100 },
    fill: { color },
  });
}

function addImage(
  slide: Slide,
  data: string,
  x: number,
  y: number,
  w: number,
  h: number,
  altText: string,
  mode: 'contain' | 'cover' = 'contain',
): void {
  slide.addImage({
    data,
    x: mm(x), y: mm(y), w: mm(w), h: mm(h),
    sizing: { type: mode, x: mm(x), y: mm(y), w: mm(w), h: mm(h) },
    altText,
  });
}

function estimateTextHeightMm(text: string, widthMm: number, fontSize: number, minLines = 1): number {
  const averageCharacterMm = fontSize * 0.18;
  const columns = Math.max(14, Math.floor(widthMm / averageCharacterMm));
  const lines = text.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length / columns)), 0);
  return Math.max(minLines, lines) * fontSize * 0.46 + 1.8;
}

function addFooter(slide: Slide, coproprieteName: string, page: number): void {
  const name = coproprieteName.trim() || PART3_VALEUR_A_CONFIRMER;
  addText(slide, `Copropriété ${name}`, 62, 284.5, 86, 5, {
    fontSize: 9.5, align: 'center', color: MUTED, valign: 'middle',
  });
  addText(slide, String(page), 171.5, 284.5, 7, 5, {
    fontSize: 9.5, align: 'right', color: MUTED, valign: 'middle',
  });
}

function addHeader(slide: Slide, logoData: string, sectionTitle: string): void {
  addImage(slide, logoData, 15, 2.7, 62.4, 16.5, 'Logo France Verte');
  addRule(slide, 15, 22.1, 180.1, 9.3, GREEN);
  addText(slide, sectionTitle, 18, 22.7, 174, 8.1, {
    fontFace: TITLE_FONT, fontSize: 15.8, color: WHITE, bold: true, align: 'center', valign: 'middle',
  });
}

function addPage(
  pptx: pptxgen,
  slides: Slide[],
  assets: Part3PresentationAssets,
  sectionTitle: string,
  coproprieteName: string,
  firstPageNumber: number,
  options: { showHeader?: boolean } = {},
): Slide {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  if (options.showHeader ?? true) addHeader(slide, assets.logoData, sectionTitle);
  addFooter(slide, coproprieteName, firstPageNumber + slides.length);
  slides.push(slide);
  return slide;
}

function addCell(
  slide: Slide,
  x: number,
  y: number,
  w: number,
  h: number,
  text: Text,
  options: {
    fill?: string;
    color?: string;
    bold?: boolean;
    italic?: boolean;
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle' | 'bottom';
    fontSize?: number;
    lineColor?: string;
  } = {},
): void {
  addRect(slide, x, y, w, h, options.fill ?? WHITE, options.lineColor ?? BORDER);
  addText(slide, text, x + 1.7, y + 1.1, w - 3.4, h - 2.2, {
    fontSize: options.fontSize ?? 8.7,
    color: options.color ?? INK,
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    align: options.align ?? 'left',
    valign: options.valign ?? 'middle',
  });
}

function addTitle(slide: Slide, title: string, y = 37.5): number {
  addText(slide, title, 18, y, 174, 7.2, { fontFace: TITLE_FONT, fontSize: 13, bold: true, valign: 'middle' });
  return y + 10;
}

function addParagraph(slide: Slide, text: string, y: number, options: {
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  width?: number;
  x?: number;
  bottomGap?: number;
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
} = {}): number {
  const width = options.width ?? 174;
  const x = options.x ?? 18;
  const fontSize = options.fontSize ?? 8.4;
  const height = estimateTextHeightMm(text, width, fontSize);
  addText(slide, text, x, y, width, height, {
    fontSize,
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    color: options.color ?? INK,
    align: options.align ?? 'justify',
  });
  return y + height + (options.bottomGap ?? 3.2);
}

function addBullets(slide: Slide, items: readonly string[], y: number, options: {
  fontSize?: number;
  width?: number;
  x?: number;
  bottomGap?: number;
  itemGap?: number;
} = {}): number {
  let current = y;
  const x = options.x ?? 21;
  const width = options.width ?? 170;
  const fontSize = options.fontSize ?? 8.4;
  for (const item of items) {
    const height = estimateTextHeightMm(item, width - 5, fontSize);
    addText(slide, '•', x, current, 3.5, height, { fontSize, valign: 'top' });
    addText(slide, item, x + 4, current, width - 4, height, { fontSize, valign: 'top' });
    current += height + (options.itemGap ?? 1.3);
  }
  return current + (options.bottomGap ?? 2.2);
}

function addRubrics(
  slide: Slide,
  rubrics: readonly StaticRubric[],
  y: number,
  options: { fontSize?: number; width?: number; x?: number; titleFontSize?: number; compact?: boolean } = {},
): number {
  let current = y;
  const fontSize = options.fontSize ?? 8.15;
  const width = options.width;
  const x = options.x;
  const titleFontSize = options.titleFontSize ?? 10;
  const gaps = options.compact
    ? { title: 0.6, text: 1, bullets: 1, suite: 0.9, suiteBullets: 1.1 }
    : { title: 1.1, text: 1.8, bullets: 1.8, suite: 1.6, suiteBullets: 2 };
  for (const rubric of rubrics) {
    current = addParagraph(slide, rubric.titre, current, { x, width, fontSize: titleFontSize, bold: true, color: GREEN, bottomGap: gaps.title });
    if (rubric.texte) current = addParagraph(slide, rubric.texte, current, { x, width, fontSize, bottomGap: gaps.text });
    if (rubric.puces?.length) current = addBullets(slide, rubric.puces, current, { x, width, fontSize, bottomGap: gaps.bullets, itemGap: options.compact ? 0.5 : undefined });
    if (rubric.suite) current = addParagraph(slide, rubric.suite, current, { x, width, fontSize, bottomGap: gaps.suite });
    if (rubric.suitePuces?.length) current = addBullets(slide, rubric.suitePuces, current, { x, width, fontSize, bottomGap: gaps.suiteBullets, itemGap: options.compact ? 0.5 : undefined });
  }
  return current;
}

function formatEur(amount: number | null): string {
  return amount === null ? PART3_VALEUR_A_CONFIRMER : `${new Intl.NumberFormat('fr-FR').format(amount)} €`;
}

function percentage(part: number, total: number): string {
  if (total === 0) return '0';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format((part / total) * 100);
}

function documentaryRow(data: Part3ReportData, tableId: string, rowId: string): LigneDocumentairePartie3 {
  const table = data.documentation[tableId as keyof Part3ReportData['documentation']] as Record<string, LigneDocumentairePartie3>;
  return table[rowId];
}

function addDocumentaryTableHeader(slide: Slide, y: number): void {
  addCell(slide, 15, y, 97, 9, 'DESIGNATION', { fill: WHITE, color: INK, bold: true, align: 'center', fontSize: 10 });
  addCell(slide, 112, y, 32, 9, 'STATUT', { fill: WHITE, color: INK, bold: true, align: 'center', fontSize: 10 });
  addCell(slide, 144, y, 51, 9, 'COMMENTAIRE', { fill: WHITE, color: INK, bold: true, align: 'center', fontSize: 10 });
}

function splitTextForHeight(text: string, widthMm: number, fontSize: number, maxHeightMm: number): string[] {
  const normalized = text.trim();
  if (!normalized) return [''];
  const words = normalized.split(/\s+/u);
  const chunks: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && estimateTextHeightMm(next, widthMm, fontSize) > maxHeightMm) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function documentaryRowHeight(description: string, comment: string, includeDescription: boolean): number {
  const left = includeDescription ? estimateTextHeightMm(description, 93, 10, 2) + 2 : 0;
  const right = estimateTextHeightMm(comment, 47, 10, 1) + 2;
  // The reference table fits six concise rows on an A4 page.  More verbose
  // user comments are split above, so a smaller baseline row remains legible
  // while preserving that expected one-page layout.
  return Math.max(26, Math.max(left, right));
}

interface DocumentaryTableRender {
  slides: Slide[];
  finalY: number;
}

/**
 * Renders the editable status/comment tables and repeats their header when a
 * verbose optional comment needs a continuation slide.
 */
function appendDocumentaryTable(
  pptx: pptxgen,
  slides: Slide[],
  data: Part3ReportData,
  assets: Part3PresentationAssets,
  sectionTitle: string,
  coproprieteName: string,
  firstPageNumber: number,
  tableId: string,
  title: string,
  startY: number,
): DocumentaryTableRender {
  const catalogue = PART3_TABLEAUX_DOCUMENTAIRES_MODELE[tableId];
  if (!catalogue) throw new Error(`Tableau documentaire Partie 3 inconnu : ${tableId}`);
  const tableSlides: Slide[] = [];
  let slide = addPage(pptx, slides, assets, sectionTitle, coproprieteName, firstPageNumber);
  tableSlides.push(slide);
  let y = startY;
  if (title) {
    y = addTitle(slide, title, y);
  }
  addDocumentaryTableHeader(slide, y);
  y += 9;

  for (const templateRow of catalogue.lignes) {
    const answer = documentaryRow(data, tableId, templateRow.id);
    const description: Text = [
      { text: templateRow.designation, options: { bold: true } },
      { text: `\n${templateRow.references}`, options: { italic: true, color: MUTED } },
      { text: `\n${templateRow.obligation}` },
    ];
    const descriptionForMeasure = `${templateRow.designation}\n${templateRow.references}\n${templateRow.obligation}`;
    const commentChunks = splitTextForHeight(answer.commentaire ?? '', 47, 10, 43);
    commentChunks.forEach((comment, chunkIndex) => {
      const includeDescription = chunkIndex === 0;
      const height = documentaryRowHeight(descriptionForMeasure, comment, includeDescription);
      if (y + height > 279) {
        slide = addPage(pptx, slides, assets, sectionTitle, coproprieteName, firstPageNumber);
        tableSlides.push(slide);
        const continuationTitle = `${title} — suite`;
        y = addTitle(slide, continuationTitle, 37.5);
        addDocumentaryTableHeader(slide, y);
        y += 9;
      }
      const continuationLabel: Text = [
        { text: templateRow.designation, options: { bold: true } },
        { text: '\nSuite du commentaire', options: { italic: true, color: MUTED } },
      ];
      addCell(slide, 15, y, 97, height, includeDescription ? description : continuationLabel, { valign: 'middle', align: 'center', fontSize: 10 });
      addCell(slide, 112, y, 32, height, includeDescription ? LIBELLES_STATUTS_DOCUMENTAIRES_PARTIE3[answer.statut!] : '—', {
        fill: includeDescription ? STATUS_FILLS[answer.statut!] : WHITE,
        color: includeDescription ? WHITE : MUTED,
        bold: includeDescription,
        align: 'center',
        fontSize: 10,
      });
      addCell(slide, 144, y, 51, height, comment, { valign: 'top', fontSize: 10 });
      y += height;
    });
  }
  return { slides: tableSlides, finalY: y };
}

function addReferenceStripTable(slide: Slide, title: string, y: number): number {
  // The reference uses a navy full-width heading and one two-column data row.
  // Its example contract, work and vote details are deliberately not copied.
  addCell(slide, 15, y, 180, 9, title, { fill: NAVY, color: WHITE, bold: true, fontSize: 10 });
  addCell(slide, 15, y + 9, 90, 9, PART3_VALEUR_A_CONFIRMER, { fontSize: 10 });
  addCell(slide, 105, y + 9, 90, 9, '', { fontSize: 10 });
  return y + 18;
}

function addAidesParagraph(slide: Slide, text: string, y: number, fontSize: number): number {
  const prefix = 'Aides disponibles :';
  const height = estimateTextHeightMm(text, 174, fontSize);
  addText(slide, [
    { text: prefix, options: { underline: { style: 'sng' } } },
    { text: text.slice(prefix.length) },
  ], 18, y, 174, height, { fontSize, align: 'justify' });
  return y + height + 2;
}

function addStaticEvolutionSlide(
  pptx: pptxgen,
  slides: Slide[],
  assets: Part3PresentationAssets,
  coproprieteName: string,
  firstPageNumber: number,
  content: StaticEvolutionSlide,
): Slide {
  const sectionTitle = PART3_SECTION_3_EVOLUTIONS_REGLEMENTAIRES.titreSection;
  const slide = addPage(pptx, slides, assets, sectionTitle, coproprieteName, firstPageNumber);
  let y = addTitle(slide, content.titre);
  if (content.titre === '3.3 Extinction des réseaux 2G et 3G') {
    if (content.sousTitre) y = addParagraph(slide, content.sousTitre, y, { fontSize: 10.6, bold: true, color: INK, bottomGap: 2.6 });
    for (const [index, rubric] of (content.rubriques ?? []).entries()) {
      y = addParagraph(slide, rubric.titre, y, { fontSize: 10, bold: rubric.titre !== 'Cette évolution peut nécessiter :', color: rubric.titre === 'Cette évolution peut nécessiter :' ? INK : '00B050', bottomGap: 1.1 });
      if (rubric.texte) {
        const [context, alert] = rubric.texte.split('\n\nÀ compter du 31 mars 2026,');
        if (context) y = addParagraph(slide, context, y, { fontSize: 9.2, bottomGap: alert ? 0.7 : 1.1 });
        if (alert) y = addParagraph(slide, `À compter du 31 mars 2026,${alert}`, y, { fontSize: 9.2, color: 'FF0000', bottomGap: 1.1 });
      }
      if (rubric.puces?.length) y = addBullets(slide, rubric.puces, y, { fontSize: 9.2, bottomGap: index === 0 ? 0.9 : 1.1, itemGap: 0.35 });
      if (rubric.suite) y = addParagraph(slide, rubric.suite, y, { fontSize: 9.2, bottomGap: 0.9 });
      if (rubric.suitePuces?.length) y = addBullets(slide, rubric.suitePuces, y, { fontSize: 9.2, bottomGap: 1.1, itemGap: 0.35 });
    }
    return slide;
  }
  if (content.titre.startsWith('3.2 ')) {
    if (content.sousTitre) y = addParagraph(slide, content.sousTitre, y, { fontSize: 10.6, bold: true, bottomGap: 3 });
    for (const rubric of content.rubriques ?? []) {
      y = addParagraph(slide, rubric.titre, y, { fontSize: 10.2, bold: true, color: GREEN, bottomGap: 0.4 });
      if (!rubric.texte) continue;
      const alertPrefix = 'À compter du 1 er janvier 2030';
      const alertAt = rubric.texte.indexOf(alertPrefix);
      if (alertAt < 0) y = addParagraph(slide, rubric.texte, y, { fontSize: 10, bottomGap: 3 });
      else {
        y = addParagraph(slide, rubric.texte.slice(0, alertAt).trim(), y, { fontSize: 10, bottomGap: 3 });
        y = addParagraph(slide, rubric.texte.slice(alertAt), y, { fontSize: 10, color: 'FF2020', bottomGap: 3 });
      }
    }
    return slide;
  }
  const bodyFont = content.secondBlocs?.length ? 9.7 : 9;
  if (content.sousTitre) y = addParagraph(slide, content.sousTitre, y, { fontSize: 10.6, bold: true, color: INK, bottomGap: 2.6 });
  for (const [index, block] of (content.blocs ?? []).entries()) y = addParagraph(slide, block, y, { fontSize: bodyFont, color: index === 0 ? 'FF2020' : INK, bottomGap: 2.1 });
  if (content.puces?.length) y = addBullets(slide, content.puces, y, { fontSize: bodyFont, bottomGap: 2.2 });
  if (content.aidesDisponibles) y = addAidesParagraph(slide, content.aidesDisponibles, y, bodyFont);
  if (content.secondSousTitre) y = addParagraph(slide, content.secondSousTitre, y, { fontSize: 10.4, bold: true, color: INK, bottomGap: 2.1 });
  for (const [index, block] of (content.secondBlocs ?? []).entries()) y = addParagraph(slide, block, y, { fontSize: 9.7, color: index === 0 ? 'FF2020' : INK, bottomGap: 1.7 });
  if (content.secondAidesDisponibles) addAidesParagraph(slide, content.secondAidesDisponibles, y, 9.7);
  if (content.rubriques?.length) addRubrics(slide, content.rubriques, y, { fontSize: 9 });
  return slide;
}

function addDefibrillatorSlide(
  pptx: pptxgen,
  slides: Slide[],
  assets: Part3PresentationAssets,
  coproprieteName: string,
  firstPageNumber: number,
): Slide {
  const fixed = PART3_SECTION_4_RECOMMANDATIONS_COMPLEMENTAIRES;
  const slide = addPage(pptx, slides, assets, fixed.titreSection, coproprieteName, firstPageNumber);
  let y = addTitle(slide, fixed.titre);
  y = addParagraph(slide, fixed.introduction, y, { fontSize: 10, width: 111, bottomGap: 3 });
  y = Math.max(y, 79);
  for (const block of fixed.blocs) y = addParagraph(slide, block, y, { fontSize: 10, bottomGap: 2.5 });
  y = addBullets(slide, fixed.avantages, y, { fontSize: 10, bottomGap: 1.8, itemGap: 0.1 });
  for (const block of fixed.suite) y = addParagraph(slide, block, y, { fontSize: 10, bottomGap: 2.5 });
  y = addBullets(slide, fixed.recommandations, y, { fontSize: 10, bottomGap: 2, itemGap: 0.1 });
  addParagraph(slide, fixed.conclusion, y, { fontSize: 10, bottomGap: 2.5 });
  if (assets.staticAssets?.defibrillatorData) {
    addImage(slide, assets.staticAssets.defibrillatorData, 134, 43.5, 39, 33, 'Illustration de défibrillateur');
  } else {
    addRect(slide, 134, 43.5, 39, 33, 'F7F7F7', LIGHT_GRAY);
    addText(slide, 'Illustration du modèle', 135, 56, 37, 7, { color: MUTED, align: 'center', fontSize: 8, valign: 'middle' });
  }
  return slide;
}

function addLawClimateSlide(
  pptx: pptxgen,
  slides: Slide[],
  assets: Part3PresentationAssets,
  coproprieteName: string,
  firstPageNumber: number,
): Slide {
  const fixed = PART3_SECTION_6_SYNTHESE_PPPT.loiClimatEtResilience;
  const slide = addPage(pptx, slides, assets, PART3_SECTION_6_SYNTHESE_PPPT.titreSection, coproprieteName, firstPageNumber);
  let y = addTitle(slide, fixed.titre);
  for (const block of fixed.blocs) y = addParagraph(slide, block, y, { fontSize: 10, bottomGap: 2.4 });
  const startY = Math.max(y, 154);
  const columns = [26.5, 78.5, 130.5, 182.5];
  ['Pour la vente', 'Dates clés', 'Pour la location'].forEach((title, index) => {
    addCell(slide, columns[index], startY, columns[index + 1] - columns[index], 9, title, {
      fill: WHITE, color: '0070C0', bold: true, align: 'center', fontSize: 10,
    });
  });
  const rows = [
    { date: 'Août 2022', height: 18, sale: '', rental: 'Gel des loyers', saleClasses: [], rentalClasses: ['F', 'G'] },
    { date: 'Janvier 2023', height: 30, sale: 'Audit énergétique\nobligatoire', rental: 'Location interdite', saleClasses: ['F', 'G'], rentalClasses: ['G'], condition: 'Si la consommation annuelle\n> 450 kWh/m²' },
    { date: 'Janvier 2025', height: 21, sale: 'Audit énergétique\nobligatoire', rental: 'Location interdite', saleClasses: ['E'], rentalClasses: ['G'] },
    { date: 'Janvier 2028', height: 17, sale: '', rental: 'Location interdite', saleClasses: [], rentalClasses: ['F'] },
    { date: 'Janvier 2034', height: 21, sale: 'Audit énergétique\nobligatoire', rental: 'Location interdite', saleClasses: ['D'], rentalClasses: ['E'] },
  ] as const;
  const dpeAssets: Record<'D' | 'E' | 'F' | 'G', string | undefined> = {
    D: assets.staticAssets?.dpeClassDData,
    E: assets.staticAssets?.dpeClassEData,
    F: assets.staticAssets?.dpeClassFData,
    G: assets.staticAssets?.dpeClassGData,
  };
  const fallbackFills = { D: 'F3DF00', E: 'F4B51B', F: 'EF8737', G: 'DD2232' };
  const addClasses = (classes: readonly ('D' | 'E' | 'F' | 'G')[], x: number, classY: number) => {
    classes.forEach((level, index) => {
      const badgeX = x + index * 20;
      const badge = dpeAssets[level];
      if (badge) addImage(slide, badge, badgeX, classY, 15.5, 8.5, `Étiquette énergétique ${level}`);
      else addCell(slide, badgeX, classY, 15.5, 8.5, level, { fill: fallbackFills[level], bold: true, align: 'center', fontSize: 11 });
    });
  };
  let rowY = startY + 9;
  rows.forEach((row) => {
    const condition = 'condition' in row ? row.condition : undefined;
    for (let column = 0; column < 3; column += 1) addCell(slide, columns[column], rowY, 52, row.height, '', { fontSize: 10 });
    addText(slide, row.date, columns[1] + 2, rowY + row.height / 2 - 3, 48, 6, { color: GREEN, bold: true, align: 'center', fontSize: 10, valign: 'middle' });
    if (row.sale) addText(slide, row.sale, columns[0] + 2, rowY + 2, 48, 9, { bold: true, align: 'center', fontSize: 10, valign: 'middle' });
    if (row.rental) addText(slide, row.rental, columns[2] + 2, rowY + 2, 48, 6, { bold: true, align: 'center', fontSize: 10, valign: 'middle' });
    if (row.saleClasses.length) addClasses(row.saleClasses, columns[0] + (52 - row.saleClasses.length * 20 + 4.5) / 2, rowY + row.height - 10);
    if (row.rentalClasses.length) addClasses(row.rentalClasses, columns[2] + (52 - row.rentalClasses.length * 20 + 4.5) / 2, rowY + (condition ? 9 : row.height - 10));
    if (condition) addText(slide, condition, columns[2] + 2, rowY + 18, 48, 10, { align: 'center', fontSize: 9.5, valign: 'middle' });
    rowY += row.height;
  });
  return slide;
}

function addDpeSlide(
  pptx: pptxgen,
  slides: Slide[],
  data: Part3ReportData,
  assets: Part3PresentationAssets,
  coproprieteName: string,
  firstPageNumber: number,
): Slide {
  const fixed = PART3_SECTION_6_SYNTHESE_PPPT.dpeCollectif;
  const slide = addPage(pptx, slides, assets, PART3_SECTION_6_SYNTHESE_PPPT.titreSection, coproprieteName, firstPageNumber);
  let y = addTitle(slide, fixed.titre);
  for (const block of fixed.blocs.slice(0, 3)) y = addParagraph(slide, block, y, { fontSize: 10, bottomGap: 2.2 });
  y = addParagraph(slide, `La réalisation du DPE collectif : ${PART3_VALEUR_A_CONFIRMER}.`, y, { fontSize: 10, bottomGap: 1 });
  y = addParagraph(slide, fixed.blocs[4], y, { fontSize: 10, bottomGap: 1.5 });
  y = Math.max(y, 135);
  addText(slide, `${fixed.libellesDynamiques[0]} : ${PART3_VALEUR_A_CONFIRMER}`, 18, y, 174, 5, { fontSize: 10, bold: true, valign: 'middle' });
  addText(slide, `${fixed.libellesDynamiques[1]} : ${PART3_VALEUR_A_CONFIRMER}`, 18, y + 5, 174, 5, { fontSize: 10, bold: true, valign: 'middle' });
  const visualY = 185;
  const boxes: readonly [RoleVisuelDpePartie3, string, string, number][] = [
    ['etiquette_energetique_etat_initial', fixed.visuels[0], '', 15],
    ['etiquette_energetique_scenario_renovation_ambitieux', fixed.visuels[1], fixed.visuels[2], 105],
  ];
  boxes.forEach(([role, label, subtitle, x]) => {
    addCell(slide, x, visualY, 90, 12, subtitle ? `${label}\n${subtitle}` : label, {
      fill: NAVY, color: WHITE, bold: true, align: 'center', fontSize: 10,
    });
    addRect(slide, x, visualY + 12, 90, 61, WHITE, BORDER);
    const visual = assets.dpeVisuals[role];
    if (visual) addImage(slide, visual.data, x + 3, visualY + 15, 84, 55, `Étiquette DPE — ${label}`);
  });
  // Keep the legend below the two dynamic DPE lines, even when both are placeholders.
  addText(slide, fixed.legende, 18, Math.max(y + 12, 159), 174, 12, { fontSize: 10, color: '0070C0' });
  return slide;
}

function addDpeScenarioSlide(
  pptx: pptxgen,
  slides: Slide[],
  assets: Part3PresentationAssets,
  coproprieteName: string,
  firstPageNumber: number,
): Slide {
  const fixed = PART3_SECTION_6_SYNTHESE_PPPT.tableauxDpeEtScenarios;
  const slide = addPage(pptx, slides, assets, PART3_SECTION_6_SYNTHESE_PPPT.titreSection, coproprieteName, firstPageNumber);
  // The model has three separate editable grids, without a repeated 6.2 title.
  // The scenario cells stay empty because those values are outside the input contract.
  const topColumns = [15, 119, 144, 170, 195];
  fixed.entetesComparatif.forEach((header, index) => addCell(slide, topColumns[index], 37, topColumns[index + 1] - topColumns[index], 9, header, {
    fill: NAVY, color: WHITE, align: 'center', fontSize: 10,
  }));
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      addCell(slide, topColumns[column], 46 + row * 9, topColumns[column + 1] - topColumns[column], 9, '', { fontSize: 10 });
    }
  }

  const compareColumns = [15, 94.5, 119.5, 144.5, 169.5, 195];
  ['État initial', 'Scénario 1', 'Scénario 2', 'Scénario 3'].forEach((header, index) => {
    addCell(slide, compareColumns[index + 1], 119, compareColumns[index + 2] - compareColumns[index + 1], 9, header, {
      fill: NAVY, color: WHITE, align: 'center', fontSize: 9.5,
    });
  });
  const mainRows = fixed.lignesComparatif.slice(0, 5);
  mainRows.forEach((label, index) => {
    const rowY = 128 + index * 10;
    addCell(slide, 15, rowY, 79.5, 10, label, { fill: NAVY, color: WHITE, fontSize: 9.5 });
    for (let column = 1; column < 5; column += 1) {
      addCell(slide, compareColumns[column], rowY, compareColumns[column + 1] - compareColumns[column], 10, '', { fontSize: 9.5 });
    }
  });
  fixed.lignesComparatif.slice(5).forEach((label, index) => {
    const rowY = 185 + index * 12;
    addCell(slide, 15, rowY, 79.5, 12, label, { fill: NAVY, color: WHITE, fontSize: 9.5 });
    for (let column = 1; column < 5; column += 1) {
      addCell(slide, compareColumns[column], rowY, compareColumns[column + 1] - compareColumns[column], 12, '', { fontSize: 9.5 });
    }
  });
  return slide;
}

function addCurativeIntroSlide(
  pptx: pptxgen,
  slides: Slide[],
  assets: Part3PresentationAssets,
  coproprieteName: string,
  firstPageNumber: number,
): Slide {
  const fixed = PART3_SECTION_6_SYNTHESE_PPPT.syntheseCuratifs;
  const slide = addPage(pptx, slides, assets, PART3_SECTION_6_SYNTHESE_PPPT.titreSection, coproprieteName, firstPageNumber);
  let y = addTitle(slide, fixed.titre);
  for (const block of fixed.blocs) y = addParagraph(slide, block, y, { fontSize: 10, bottomGap: 3 });
  fixed.tableaux.forEach((tableau) => {
    y = addParagraph(slide, `•  ${tableau.titre}`, y, { fontSize: 10, bold: true, bottomGap: 2.5, align: 'left' });
    y = addParagraph(slide, tableau.description, y, { fontSize: 10, bottomGap: 5 });
  });
  return slide;
}

function addCurativeHeader(slide: Slide, y: number): void {
  const columns = [15, 34, 54, 114, 135, 155, 175, 195];
  const labels = [
    'Niveau\ndu curatif', 'Numéro\ndu curatif', 'Nature de travaux', 'Chiffrage\n(TTC)',
    'Curatif\nniveau 1\n(Impact\nfort)', 'Curatif\nniveau 2\n(Impact\nmodéré)', 'Curatif\nniveau 3\n(Impact\nfaible)',
  ];
  labels.forEach((label, index) => addCell(slide, columns[index], y, columns[index + 1] - columns[index], 22, label, {
    fill: '176181', color: WHITE, bold: true, align: 'center', fontSize: 9.5,
  }));
}

function curativeRowHeight(text: string): number {
  return Math.max(16, estimateTextHeightMm(text, 56, 9.5, 2) + 2);
}

function addCurativeRow(
  slide: Slide,
  y: number,
  line: RecapitulatifCuratifsPartie3['lignes'][number],
  natureTravaux: string,
  showIdentity: boolean,
): void {
  const height = curativeRowHeight(natureTravaux);
  const code = line.niveau === 'Curatif Niveau 1' ? 'C1' : line.niveau === 'Curatif Niveau 2' ? 'C2' : 'C3';
  const rowFill = line.niveau === 'Curatif Niveau 1' ? 'F6A5A8' : line.niveau === 'Curatif Niveau 2' ? 'FBD3A9' : 'C4EDCB';
  addCell(slide, 15, y, 19, height, showIdentity ? code : '', {
    fill: CURATIVE_COLORS[line.niveau],
    color: INK,
    bold: true,
    align: 'center',
    fontSize: 9,
  });
  addCell(slide, 34, y, 20, height, showIdentity ? String(line.numero) : '', { fill: rowFill, align: 'center', fontSize: 9.5 });
  addCell(slide, 54, y, 60, height, natureTravaux, { fill: rowFill, valign: 'middle', fontSize: 9.5 });
  addCell(slide, 114, y, 21, height, showIdentity ? formatEur(line.montantEstimeTtcEur) : '', { fill: rowFill, align: 'center', fontSize: 9.5 });
  const levels: readonly NiveauCuratifPartie3[] = ['Curatif Niveau 1', 'Curatif Niveau 2', 'Curatif Niveau 3'];
  levels.forEach((level, index) => addCell(slide, 135 + index * 20, y, 20, height, showIdentity && line.niveau === level ? '✓' : '', {
    fill: rowFill, align: 'center', fontSize: 11, bold: true, color: INK,
  }));
}

function addCurativeTotals(slide: Slide, y: number, summary: RecapitulatifCuratifsPartie3): number {
  const fixed = PART3_SECTION_6_SYNTHESE_PPPT.tableauRecapitulatifCuratifs;
  let current = y;
  const levels: readonly NiveauCuratifPartie3[] = ['Curatif Niveau 1', 'Curatif Niveau 2', 'Curatif Niveau 3'];
  levels.forEach((level, index) => {
    addCell(slide, 34, current, 101, 12, `${fixed.totaux[index].titre}\n${fixed.totaux[index].calendrierModele}`, { fill: 'D9EAF7', align: 'center', fontSize: 9 });
    levels.forEach((columnLevel, columnIndex) => addCell(slide, 135 + columnIndex * 20, current, 20, 12,
      columnLevel === level ? formatEur(summary.totauxParNiveau[level]) : '',
      { fill: 'D9EAF7', bold: columnLevel === level, align: 'center', fontSize: 9 }));
    current += 12;
  });
  addCell(slide, 34, current, 101, 11, fixed.totalGeneral, { fill: 'D9EAF7', fontSize: 9 });
  addCell(slide, 135, current, 60, 11, formatEur(summary.totalTtcEur), { fill: 'D9EAF7', bold: true, align: 'center', fontSize: 9 });
  current += 13;
  addText(slide, summary.libelleChiffrage, 15, current, 180, 5, { fontSize: 9, italic: true, color: MUTED, align: 'right', valign: 'middle' });
  return current + 5;
}

function appendCurativeSummarySlides(
  pptx: pptxgen,
  slides: Slide[],
  summary: RecapitulatifCuratifsPartie3,
  assets: Part3PresentationAssets,
  coproprieteName: string,
  firstPageNumber: number,
): Slide[] {
  const sectionTitle = PART3_SECTION_6_SYNTHESE_PPPT.titreSection;
  const title = PART3_SECTION_6_SYNTHESE_PPPT.tableauRecapitulatifCuratifs.titre;
  const result: Slide[] = [];
  let slide = addPage(pptx, slides, assets, sectionTitle, coproprieteName, firstPageNumber);
  result.push(slide);
  let y = addTitle(slide, title);
  addCurativeHeader(slide, y);
  y += 22;
  for (const line of summary.lignes) {
    const chunks = splitTextForHeight(line.natureTravaux, 56, 9.5, 36);
    chunks.forEach((natureTravaux, chunkIndex) => {
      const height = curativeRowHeight(natureTravaux);
      // Reserve the totals on the final page if it has enough vertical room.
      if (y + height > 225) {
        slide = addPage(pptx, slides, assets, sectionTitle, coproprieteName, firstPageNumber);
        result.push(slide);
        y = addTitle(slide, `${title} — suite`);
        addCurativeHeader(slide, y);
        y += 22;
      }
      addCurativeRow(slide, y, line, natureTravaux, chunkIndex === 0);
      y += height;
    });
  }
  if (y + 50 > 279) {
    slide = addPage(pptx, slides, assets, sectionTitle, coproprieteName, firstPageNumber);
    result.push(slide);
    y = addTitle(slide, `${title} — totaux`);
    addCurativeHeader(slide, y);
    y += 22;
  }
  if (summary.lignes.length === 0) {
    for (let row = 0; row < 4; row += 1) {
      for (const [x, width] of [[15, 19], [34, 20], [54, 60], [114, 21], [135, 20], [155, 20], [175, 20]] as const) {
        addCell(slide, x, y, width, 16, '', { fontSize: 9.5 });
      }
      y += 16;
    }
  }
  addCurativeTotals(slide, y, summary);
  return result;
}

function addEnergySummarySlide(
  pptx: pptxgen,
  slides: Slide[],
  assets: Part3PresentationAssets,
  coproprieteName: string,
  firstPageNumber: number,
): Slide {
  const fixed = PART3_SECTION_6_SYNTHESE_PPPT.tableauRecapitulatifTravauxEnergetiques;
  const slide = addPage(pptx, slides, assets, PART3_SECTION_6_SYNTHESE_PPPT.titreSection, coproprieteName, firstPageNumber);
  addTitle(slide, fixed.titre);
  const columns = [15, 43, 62, 157, 195];
  fixed.enTetes.forEach((header, index) => addCell(slide, columns[index], 47, columns[index + 1] - columns[index], 14, header, {
    fill: '176181', color: WHITE, bold: true, align: 'center', fontSize: 9.5,
  }));
  addCell(slide, 15, 61, 28, 40, fixed.niveau, { fill: '50AB2C', align: 'center', fontSize: 10 });
  for (let row = 0; row < 4; row += 1) {
    const rowY = 61 + row * 10;
    addCell(slide, 43, rowY, 19, 10, '', { fill: 'B6E3A4' });
    addCell(slide, 62, rowY, 95, 10, '', { fill: 'B6E3A4' });
    addCell(slide, 157, rowY, 38, 10, '', { fill: 'B6E3A4' });
  }
  addCell(slide, 62, 101, 95, 11, fixed.total, { fill: 'D9EAF7', align: 'center', fontSize: 9.5 });
  addCell(slide, 157, 101, 38, 11, PART3_VALEUR_A_CONFIRMER, { fill: 'D9EAF7', align: 'center', fontSize: 9.5 });
  let y = addParagraph(slide, fixed.programmation.titre, 208, { fontSize: 10.5, bold: true, bottomGap: 2, align: 'left' });
  for (const block of fixed.programmation.blocs) y = addParagraph(slide, block, y, { fontSize: 10, bottomGap: 2.6 });
  return slide;
}

function addConclusionSlide(
  pptx: pptxgen,
  slides: Slide[],
  summary: RecapitulatifCuratifsPartie3,
  assets: Part3PresentationAssets,
  coproprieteName: string,
  firstPageNumber: number,
): Slide {
  const fixed = PART3_SECTION_7_CONCLUSION;
  const slide = addPage(pptx, slides, assets, fixed.titreSection, coproprieteName, firstPageNumber);
  let y = addTitle(slide, fixed.titre);
  y = addParagraph(slide, fixed.paragraphesFixes[0], y, { fontSize: 10, bottomGap: 4 });
  const total = summary.lignes.length;
  const counts: Record<NiveauCuratifPartie3, number> = {
    'Curatif Niveau 1': summary.lignes.filter((line) => line.niveau === 'Curatif Niveau 1').length,
    'Curatif Niveau 2': summary.lignes.filter((line) => line.niveau === 'Curatif Niveau 2').length,
    'Curatif Niveau 3': summary.lignes.filter((line) => line.niveau === 'Curatif Niveau 3').length,
  };
  const values: Record<string, string> = {
    nombre_fiches_curatives: String(total),
    nombre_curatifs_niveau_1: String(counts['Curatif Niveau 1']),
    nombre_curatifs_niveau_3: String(counts['Curatif Niveau 3']),
    pourcentage_curatifs_niveau_1: percentage(counts['Curatif Niveau 1'], total),
    pourcentage_curatifs_niveau_2: percentage(counts['Curatif Niveau 2'], total),
    pourcentage_curatifs_niveau_3: percentage(counts['Curatif Niveau 3'], total),
  };
  if (total === 0) {
    y = addParagraph(slide, 'Aucune fiche curative éligible issue de la Partie 2 n’est disponible à cette étape. Les statistiques seront mises à jour lorsque des diagnostics terminés et à jour seront présents.', y, { fontSize: 10, bold: true, color: NAVY, bottomGap: 3 });
  } else {
    for (const template of fixed.paragraphesDerives) {
      const text = template.replace(/{{([^}]+)}}/g, (_match, key: string) => values[key] ?? PART3_VALEUR_A_CONFIRMER);
      y = addParagraph(slide, text, y, { fontSize: 10, bottomGap: 3 });
    }
  }
  for (const paragraph of fixed.paragraphesFixes.slice(1)) y = addParagraph(slide, paragraph, y, { fontSize: 10, bottomGap: 3 });
  return slide;
}

function addMaPrimeRenovSlide(
  slide: Slide,
  content: StaticFinanceSlide,
  assets: Part3PresentationAssets,
): void {
  const eligibility = content.rubriques?.[0];
  const steps = content.rubriques?.[1];
  addTitle(slide, content.titre);
  if (content.intro) addParagraph(slide, content.intro, 47, {
    x: 18, width: 93, fontSize: 9.5, color: '0070C0', bottomGap: 0,
  });
  if (assets.staticAssets?.maPrimeRenovLogoData) {
    addImage(slide, assets.staticAssets.maPrimeRenovLogoData, 123, 51, 69, 30, 'Logo MaPrimeRénov’ Copropriétés');
  }
  if (eligibility) {
    addText(slide, eligibility.titre, 18, 85, 174, 5, { fontSize: 10, bold: true, color: GREEN });
    let eligibilityY = 91;
    eligibility.puces?.forEach((item) => {
      const height = estimateTextHeightMm(item, 169, 9) - 0.6;
      addText(slide, `➜ ${item}`, 18, eligibilityY, 174, height, { fontSize: 9 });
      eligibilityY += height;
    });
  }
  // Keep the model's two aid tables native and editable instead of embedding image8.png.
  const aidBorders = 'FFC700';
  const left = 18;
  const mid = 105;
  const right = 192;
  const aidRows: readonly [string, string, number][] = [
    ['Travaux permettant d’atteindre un gain énergétique d’au moins 35%', '30 % du montant des travaux, plafonné à 7 500 € par lot', 9],
    ['Travaux permettant d’atteindre un gain énergétique d’au moins 50%', '45 % du montant des travaux, plafonné à 11 250 € par lot', 9],
    ['Bonification « sortie de passoire thermique » (étiquette avant travaux de F ou G)', '+ 10 % si atteinte de l’étiquette D au minimum', 11],
    ['Primes individuelles pour les copropriétaires', '', 13],
    ['Bonification pour les copropriétés fragiles et en difficulté', '+ 20 % (dans le plafond des 25 000 €)\nSous conditions d’obtention des CEE par l’Anah', 11],
  ];
  addCell(slide, left, 115, mid - left, 9, 'Conditions', { lineColor: aidBorders, bold: true, align: 'center', fontSize: 9 });
  addCell(slide, mid, 115, right - mid, 9, 'Aide pour la copropriété', { lineColor: aidBorders, bold: true, align: 'center', fontSize: 9 });
  let aidY = 124;
  aidRows.forEach(([condition, aid, height], index) => {
    addCell(slide, left, aidY, mid - left, height, condition, { lineColor: aidBorders, fontSize: 8.4 });
    if (index === 3) {
      addCell(slide, mid, aidY, (right - mid) / 2, height, '3 000 € par logement pour les ménages aux ressources très modestes', { lineColor: aidBorders, fontSize: 8.2 });
      addCell(slide, (mid + right) / 2, aidY, (right - mid) / 2, height, '1 500 € par logement pour les ménages aux ressources modestes', { lineColor: aidBorders, fontSize: 8.2 });
    } else addCell(slide, mid, aidY, right - mid, height, aid, { lineColor: aidBorders, fontSize: 8.4 });
    aidY += height;
  });
  const matrixColumns = [18, 45, 72, 99, 128, 158, 192];
  const matrixHeaders = ['', 'Ma Prime Rénov’\npour une rénovation par geste', 'Aides des\ncollectivités locales', 'Aides des fournisseurs\nd’énergie (CEE)', 'Éco-Prêt à taux zéro', 'TVA réduite à 5,5 %'];
  const matrixBorders = ['2442F5', 'FFC700', '00B55A', '2442F5', 'FFC700', '00B55A'];
  matrixHeaders.forEach((header, index) => addCell(slide, matrixColumns[index], 182, matrixColumns[index + 1] - matrixColumns[index], 13, header, {
    lineColor: matrixBorders[index], align: 'center', fontSize: 7.7,
  }));
  const matrixValues = ['Aide cumulable avec Ma Prime Rénov’ Copro', 'Cumul possible en parties privatives et parties communes', '', 'Sauf en cas de copropriétés en difficultés et copropriétés fragiles', '', ''];
  matrixValues.forEach((value, index) => addCell(slide, matrixColumns[index], 195, matrixColumns[index + 1] - matrixColumns[index], 17, value, {
    lineColor: matrixBorders[index], align: 'center', fontSize: 7.7,
    color: INK,
  }));
  matrixBorders.slice(1).forEach((color, index) => {
    const column = index + 1;
    const iconX = matrixColumns[column + 1] - 4.9;
    slide.addShape('ellipse', {
      x: mm(iconX), y: mm(196.2), w: mm(3.2), h: mm(3.2),
      line: { color, width: 1.1 },
      fill: { color: WHITE },
    });
    addText(slide, '✓', iconX + 0.35, 196.45, 2.5, 2.5, {
      fontSize: 5.5, bold: true, color, align: 'center', valign: 'middle',
    });
  });
  if (steps) {
    addText(slide, steps.titre, 18, 216, 174, 5, { fontSize: 9.6, bold: true, color: GREEN });
    let stepY = 221;
    steps.puces?.forEach((item) => {
      const height = estimateTextHeightMm(item, 166, 8.4) - 0.6;
      addText(slide, '•', 18, stepY, 3, height, { fontSize: 8.4 });
      addText(slide, item, 22, stepY, 170, height, { fontSize: 8.4 });
      stepY += height;
    });
  }
  if (content.lien) {
    addText(slide, 'Pour en savoir plus :', 18, 268, 174, 4, { fontSize: 9, bold: true, color: GREEN });
    addText(slide, content.lien, 18, 272, 174, 5, { fontSize: 8.5, color: '4B8BA5', underline: { color: '4B8BA5' } });
  }
}

function addCumulAidesSlide(slide: Slide, content: StaticFinanceSlide): void {
  addTitle(slide, content.titre);
  const aides = content.aides ?? [];
  const x = 15;
  const y = 47;
  const firstColumn = 37;
  const columnWidth = (180 - firstColumn) / Math.max(aides.length, 1);
  const headerHeight = 24;
  const rowHeights = [48, 38, 44, 30];
  const headers = aides.map((aide) => aide.replace('Eco ', 'Éco-'));
  addCell(slide, x, y, firstColumn, headerHeight, '', { fill: WHITE, lineColor: WHITE });
  headers.forEach((header, index) => {
    addCell(slide, x + firstColumn + index * columnWidth, y, columnWidth, headerHeight, header, {
      fill: '0874BD', color: WHITE, bold: true, align: 'center', fontSize: 10,
    });
  });
  const checks = [
    ['', '✓', 'Sauf en cas de copropriétés en difficultés ou fragiles', '✓'],
    ['✓', '', '✓', '✓'],
    ['Sauf en cas de copropriétés en difficultés ou fragiles', '✓', '', '✓'],
    ['✓', '✓', '✓', ''],
  ];
  let rowY = y + headerHeight;
  headers.forEach((header, row) => {
    const rowHeight = rowHeights[row];
    addCell(slide, x, rowY, firstColumn, rowHeight, header, {
      fill: '0874BD', color: WHITE, bold: true, align: 'center', fontSize: 10,
    });
    headers.forEach((_cell, column) => {
      const value = checks[row]?.[column] ?? '';
      const cellX = x + firstColumn + column * columnWidth;
      if (value.startsWith('Sauf en cas')) {
        addRect(slide, cellX, rowY, columnWidth, rowHeight, WHITE, BORDER);
        const checkY = rowY + (row === 0 ? 14 : 10);
        addText(slide, '✓', cellX + 2, checkY, columnWidth - 4, 9, {
          fontSize: 21, bold: true, align: 'center', valign: 'middle',
        });
        addText(slide, value, cellX + 2, checkY + 10, columnWidth - 4, rowHeight - (checkY - rowY) - 12, {
          fontSize: 10, align: 'center', valign: 'middle',
        });
      } else {
        addCell(slide, cellX, rowY, columnWidth, rowHeight, value, {
          fill: row === column ? '149DCE' : WHITE,
          color: INK,
          bold: value === '✓',
          align: 'center',
          valign: 'middle',
          fontSize: value === '✓' ? 21 : 10,
        });
      }
    });
    rowY += rowHeight;
  });
}

function addEcoPtzSlide(slide: Slide, content: StaticFinanceSlide, assets: Part3PresentationAssets): void {
  const intro = (content.introduction ?? '').split('\n\n');
  const [eligibility, amount, operation, takeaway] = content.rubriques ?? [];
  addTitle(slide, content.titre);
  if (intro[0]) addText(slide, intro[0], 18, 50.2, 107.7, 30, { fontSize: 10, color: '0070C0' });
  if (intro[1]) addText(slide, intro[1], 18, 84.1, 107.7, 18.5, { fontSize: 10, color: '0070C0' });
  if (assets.staticAssets?.ecoPtzData) {
    addImage(slide, assets.staticAssets.ecoPtzData, 131.9, 52.2, 67, 40, 'Illustration Éco-PTZ');
  }

  if (eligibility) {
    addText(slide, eligibility.titre, 18, 105.5, 174, 5, { fontSize: 10, bold: true, color: GREEN });
    if (eligibility.texte) addText(slide, eligibility.texte, 18, 109.7, 174, 5, { fontSize: 10 });
    const bulletYs = [114, 118.2, 122.4, 126.6];
    eligibility.puces?.forEach((item, index) => {
      addText(slide, '•', 21, bulletYs[index], 3, 5, { fontSize: 10 });
      addText(slide, item, 25, bulletYs[index], 167, 5, { fontSize: 10 });
    });
    if (eligibility.suite) addText(slide, eligibility.suite, 18, 135.1, 174, 5, { fontSize: 10 });
    const suiteYs = [139.4, 148.4];
    eligibility.suitePuces?.forEach((item, index) => {
      const height = index === 0 ? 8.5 : 5;
      addText(slide, '•', 21, suiteYs[index], 3, height, { fontSize: 10 });
      addText(slide, item, 25, suiteYs[index], 167, height, { fontSize: 10 });
    });
  }

  const addFinanceRubric = (rubric: StaticRubric | undefined, titleY: number, bodyY: number, bodyHeight: number) => {
    if (!rubric) return;
    addText(slide, rubric.titre, 18, titleY, 174, 5, { fontSize: 10, bold: true, color: GREEN });
    if (rubric.texte) addText(slide, rubric.texte, 18, bodyY, 174, bodyHeight, { fontSize: 10, align: 'justify' });
  };
  addFinanceRubric(amount, 160.5, 164.8, 23);
  addFinanceRubric(operation, 194.4, 198.6, 23);
  addFinanceRubric(takeaway, 228.3, 232.5, 15);
  if (content.lien) {
    addText(slide, 'Pour en savoir plus :', 18, 253.7, 174, 5, { fontSize: 10, bold: true, color: GREEN });
    addText(slide, content.lien, 18, 258.1, 174, 5, { fontSize: 10, color: '4B8BA5', underline: { color: '4B8BA5' } });
  }
}

function addFinanceStepsSlide(slide: Slide, content: StaticFinanceSlide): void {
  addTitle(slide, content.titre);
  const rows = content.etapes ?? [];
  let y = 49;
  rows.forEach(([title, body]) => {
    const titleHeight = estimateTextHeightMm(title, 176, 9.4) - 0.7;
    addText(slide, title, 18, y, 174, titleHeight, { fontSize: 9.4, color: GREEN, bold: true });
    y += titleHeight;
    const bodyHeight = estimateTextHeightMm(body, 174, 9.1) - 0.7;
    addText(slide, body, 18, y, 174, bodyHeight, { fontSize: 9.1, align: 'justify' });
    y += bodyHeight;
  });
}

function addFinanceSlide(
  pptx: pptxgen,
  slides: Slide[],
  assets: Part3PresentationAssets,
  coproprieteName: string,
  firstPageNumber: number,
  content: StaticFinanceSlide,
  index: number,
): Slide {
  const sectionTitle = PART3_SECTION_8_FINANCEMENTS_RENOVATION_ENERGETIQUE.titreSection;
  const slide = addPage(pptx, slides, assets, sectionTitle, coproprieteName, firstPageNumber);
  if (index === 0) {
    addMaPrimeRenovSlide(slide, content, assets);
    return slide;
  }
  if (index === 4) {
    addCumulAidesSlide(slide, content);
    return slide;
  }
  if (index === 5) {
    addFinanceStepsSlide(slide, content);
    return slide;
  }
  if (index === 2) {
    addEcoPtzSlide(slide, content, assets);
    return slide;
  }
  let y = addTitle(slide, content.titre);
  if (index === 1 && assets.staticAssets?.ceeLogoData) addImage(slide, assets.staticAssets.ceeLogoData, 140, 51, 57.1, 24, 'Logo CEE');
  if (index === 3 && assets.staticAssets?.tvaData) addImage(slide, assets.staticAssets.tvaData, 133.2, 45.6, 36, 37, 'Illustration TVA à 5,5 %');
  const usesRightVisual = index >= 1 && index <= 3;
  if (content.intro) y = addParagraph(slide, content.intro, y, {
    width: usesRightVisual ? 112 : undefined,
    fontSize: 10,
    color: usesRightVisual ? '0070C0' : INK,
    bottomGap: 2.8,
  });
  if (content.introduction) y = addParagraph(slide, content.introduction, y, {
    width: usesRightVisual ? 112 : undefined,
    fontSize: 10,
    color: usesRightVisual ? '0070C0' : INK,
    bottomGap: 2.8,
  });
  if (content.rubriques?.length) {
    addRubrics(slide, content.rubriques, usesRightVisual ? Math.max(y, 91) : y, {
      fontSize: index >= 2 ? 9 : 9.5,
      titleFontSize: index >= 2 ? 9.5 : 10,
      compact: usesRightVisual,
    });
  }
  if (content.lien) {
    const linkY = index === 3 ? 250 : index === 2 ? 270 : 263;
    addText(slide, 'Pour en savoir plus :', 18, linkY, 174, 4, { fontSize: 9.5, bold: true, color: GREEN });
    addText(slide, content.lien, 18, linkY + 4, 174, 5, { fontSize: 9, color: '4B8BA5', underline: { color: '4B8BA5' } });
  }
  return slide;
}

function addLexiconSlide(
  pptx: pptxgen,
  slides: Slide[],
  assets: Part3PresentationAssets,
  coproprieteName: string,
  firstPageNumber: number,
  definitions: readonly (readonly [string, string])[],
  introduction?: string,
  continuation = false,
): Slide {
  const slide = addPage(
    pptx,
    slides,
    assets,
    PART3_SECTION_9_LEXIQUE.titreSection,
    coproprieteName,
    firstPageNumber,
  );
  // The model repeats the logo and the green section band on the continuation page.
  let y = continuation ? 35 : 38;
  if (introduction) y = addParagraph(slide, introduction, y, { fontSize: 9.5, bottomGap: 1.2 });
  definitions.forEach(([term, definition]) => {
    const fontSize = 9.5;
    const termHeight = estimateTextHeightMm(term, 180, fontSize) - 1.1;
    addText(slide, term, 18, y, 174, termHeight, { fontSize, bold: true, valign: 'top' });
    y += termHeight;
    const definitionHeight = estimateTextHeightMm(definition, 174, fontSize) - 1.1;
    addText(slide, definition, 18, y, 174, definitionHeight, { fontSize, valign: 'top', align: 'justify' });
    y += definitionHeight + (continuation ? 0.25 : 0.4);
  });
  return slide;
}

function addDeclarationAndAnnexSlide(
  pptx: pptxgen,
  slides: Slide[],
  assets: Part3PresentationAssets,
  coproprieteName: string,
  firstPageNumber: number,
): Slide {
  const fixed = PART3_SECTIONS_10_ET_11;
  const slide = addPage(pptx, slides, assets, fixed.declarationSurHonneur.titreSection, coproprieteName, firstPageNumber);
  let y = 38;
  y = addParagraph(slide, fixed.declarationSurHonneur.texteIntroductif, y, { fontSize: 10, bottomGap: 1.8 });
  y = addBullets(slide, fixed.declarationSurHonneur.attestations, y, { fontSize: 9.5, bottomGap: 1.2 });
  y = addParagraph(slide, fixed.declarationSurHonneur.texteReference, y, { fontSize: 9, italic: true, color: '0070C0', bottomGap: 2.4 });
  const annexBandY = Math.max(y + 2, 128);
  addRule(slide, 15, annexBandY, 180.1, 9.3, GREEN);
  addText(slide, fixed.annexeGeorisques.titreSection, 18, annexBandY + 0.6, 174, 8.1, {
    fontSize: 15.8, color: WHITE, bold: true, align: 'center', valign: 'middle',
  });
  y = annexBandY + 14;
  y = addParagraph(slide, fixed.annexeGeorisques.titre, y, { fontSize: 11, bold: true, bottomGap: 2.4 });
  const annexBlocks = [
    `À confirmer : le rapport Géorisques correspondant à l’adresse de la copropriété doit être associé au présent PPPT à partir des données publiques mises à disposition par l’État.`,
    fixed.annexeGeorisques.blocs[1],
    fixed.annexeGeorisques.blocs[2],
    fixed.annexeGeorisques.blocs[3],
    fixed.annexeGeorisques.blocs[4],
    `L’intégration de l’annexe Géorisques au présent PPPT est ${PART3_VALEUR_A_CONFIRMER}. Elle ne constitue toutefois ni une étude géotechnique, ni une expertise des risques, ni une analyse structurelle du bâtiment.`,
  ];
  annexBlocks.forEach((block, index) => {
    y = addParagraph(slide, block, y, {
      fontSize: index === 3 ? 10 : 9.5,
      bold: index === 3,
      bottomGap: 2.2,
    });
  });
  return slide;
}

function addContentsEntry(entries: Part3ContentsEntry[], label: string, page: number, level: 0 | 1): void {
  entries.push({ label, page, level });
}

/**
 * Returns the fixed logical outline of Part 3 without creating a slide.
 * The renderer consumes this same outline, so an internal report composer can
 * reserve the correct number of contents pages without rendering Part 3 twice.
 */
export function planPart3Contents(): readonly Part3ContentsPlanEntry[] {
  const evolution = PART3_SECTION_3_EVOLUTIONS_REGLEMENTAIRES.diapositives as unknown as readonly StaticEvolutionSlide[];
  const finance = PART3_SECTION_8_FINANCEMENTS_RENOVATION_ENERGETIQUE.diapositives as unknown as readonly StaticFinanceSlide[];

  return [
    { label: '3. Évolutions réglementaires et normatives', level: 0 },
    ...evolution.map(({ titre }) => ({ label: titre, level: 1 as const })),
    { label: '4. Recommandations complémentaires', level: 0 },
    { label: PART3_SECTION_4_RECOMMANDATIONS_COMPLEMENTAIRES.titre, level: 1 },
    { label: '5. Analyse documentaire de la copropriété', level: 0 },
    { label: '5.1 Documents réglementaires et administratifs', level: 1 },
    { label: '5.2 Diagnostics techniques obligatoires', level: 1 },
    { label: '5.3 Contrat d’entretien', level: 1 },
    { label: 'Travaux recensés et votés', level: 1 },
    { label: '5.4 Sécurité incendie', level: 1 },
    { label: '6. Synthèse du PPPT', level: 0 },
    { label: PART3_SECTION_6_SYNTHESE_PPPT.loiClimatEtResilience.titre, level: 1 },
    { label: '6.2 Le diagnostic de performance énergétiques (DPE Collectif)', level: 1 },
    { label: PART3_SECTION_6_SYNTHESE_PPPT.syntheseCuratifs.titre, level: 1 },
    { label: PART3_SECTION_6_SYNTHESE_PPPT.tableauRecapitulatifCuratifs.titre, level: 1 },
    { label: PART3_SECTION_6_SYNTHESE_PPPT.tableauRecapitulatifTravauxEnergetiques.titre, level: 1 },
    { label: PART3_SECTION_7_CONCLUSION.titreSection, level: 0 },
    { label: PART3_SECTION_7_CONCLUSION.titre, level: 1 },
    { label: PART3_SECTION_8_FINANCEMENTS_RENOVATION_ENERGETIQUE.titreSection, level: 0 },
    ...finance.map(({ titre }) => ({ label: titre, level: 1 as const })),
    { label: '9. Lexique', level: 0 },
    { label: '9.1 Lexique', level: 1 },
    { label: '9.2 Lexique', level: 1 },
    { label: '10. Déclaration sur l’honneur', level: 0 },
    { label: '11. Annexe', level: 0 },
    { label: PART3_SECTIONS_10_ET_11.annexeGeorisques.titre, level: 1 },
  ];
}

/**
 * Appends a self-contained Part 3. It validates only Part 3 input, consumes
 * Part 2 diagnostics in read-only mode for the curative recap, and never
 * calls or alters the Part 2 PPTX generator.
 */
export function appendPart3Slides(
  pptx: pptxgen,
  data: Part3ReportData,
  items: readonly InspectionImageItem[],
  assets: Part3PresentationAssets,
  options: Part3AppendOptions = {},
): AppendedPart3Slides {
  const validation = validatePart3ReportData(data);
  if (!validation.isValid) throw new Error(`Partie 3 incomplète : ${validation.issues[0].message}`);
  const firstPageNumber = options.firstPageNumber ?? 1;
  if (!Number.isInteger(firstPageNumber) || firstPageNumber < 1) {
    throw new Error('Le numéro de première page Partie 3 doit être un entier positif.');
  }
  setA4Layout(pptx);
  const slides: Slide[] = [];
  const contents: Part3ContentsEntry[] = [];
  const coproprieteName = options.coproprieteName ?? PART3_VALEUR_A_CONFIRMER;
  const page = () => firstPageNumber + slides.length;
  const plannedContents = planPart3Contents();
  let plannedContentsIndex = 0;
  const addPlannedContentsEntry = () => {
    const entry = plannedContents[plannedContentsIndex];
    if (!entry) throw new Error('Le plan du sommaire Partie 3 est incomplet.');
    plannedContentsIndex += 1;
    addContentsEntry(contents, entry.label, page(), entry.level);
  };
  const evolution = PART3_SECTION_3_EVOLUTIONS_REGLEMENTAIRES.diapositives as unknown as readonly StaticEvolutionSlide[];

  addPlannedContentsEntry();
  evolution.forEach((content) => {
    addPlannedContentsEntry();
    addStaticEvolutionSlide(pptx, slides, assets, coproprieteName, firstPageNumber, content);
  });

  addPlannedContentsEntry();
  addPlannedContentsEntry();
  addDefibrillatorSlide(pptx, slides, assets, coproprieteName, firstPageNumber);

  addPlannedContentsEntry();
  const section5 = PART3_SECTION_5_ANALYSE_DOCUMENTAIRE.diapositives;
  addPlannedContentsEntry();
  let docsRender = appendDocumentaryTable(pptx, slides, data, assets, PART3_SECTION_5_ANALYSE_DOCUMENTAIRE.titreSection, coproprieteName, firstPageNumber, 'documentsReglementairesAdministratifs', '5.1 Documents réglementaires et administratifs', 74);
  // The reference intro is on the first page, above the table; preserve it even when a table continues.
  const section51 = section5.documentsReglementairesAdministratifs;
  let introY = 37;
  for (const paragraph of section51.introduction) introY = addParagraph(docsRender.slides[0], paragraph, introY, { fontSize: 9, bottomGap: 1.5 });
  void introY;

  addPlannedContentsEntry();
  appendDocumentaryTable(pptx, slides, data, assets, PART3_SECTION_5_ANALYSE_DOCUMENTAIRE.titreSection, coproprieteName, firstPageNumber, 'diagnosticsTechniquesObligatoires', '5.2 Diagnostics techniques obligatoires', 37.5);

  addPlannedContentsEntry();
  docsRender = appendDocumentaryTable(pptx, slides, data, assets, PART3_SECTION_5_ANALYSE_DOCUMENTAIRE.titreSection, coproprieteName, firstPageNumber, 'contratsEntretien', '5.3 Contrat d’entretien', 37.5);
  let contractSlide = docsRender.slides.at(-1)!;
  let contractY = docsRender.finalY + 5;
  const contractIntro = section5.contratsEntretien.introduction;
  const contractHeight = estimateTextHeightMm(contractIntro, 174, 9);
  if (contractY + contractHeight > 279) {
    contractSlide = addPage(pptx, slides, assets, PART3_SECTION_5_ANALYSE_DOCUMENTAIRE.titreSection, coproprieteName, firstPageNumber);
    contractY = addTitle(contractSlide, '5.3 Contrat d’entretien — suite');
  }
  contractY = addParagraph(contractSlide, contractIntro, contractY, { fontSize: 10, bottomGap: 4 });
  if (contractY + 40 > 279) {
    contractSlide = addPage(pptx, slides, assets, PART3_SECTION_5_ANALYSE_DOCUMENTAIRE.titreSection, coproprieteName, firstPageNumber);
    contractY = 38;
  }
  contractY = addReferenceStripTable(contractSlide, 'Contrat d’assurance', contractY);
  addReferenceStripTable(contractSlide, 'Contrats d’entretien des équipements communs', contractY);

  addPlannedContentsEntry();
  const historicalSlide = addPage(pptx, slides, assets, PART3_SECTION_5_ANALYSE_DOCUMENTAIRE.titreSection, coproprieteName, firstPageNumber);
  let historyY = 38;
  for (const title of section5.travauxRecenses.titres) historyY = addReferenceStripTable(historicalSlide, title, historyY + 8);

  addPlannedContentsEntry();
  appendDocumentaryTable(pptx, slides, data, assets, PART3_SECTION_5_ANALYSE_DOCUMENTAIRE.titreSection, coproprieteName, firstPageNumber, 'securiteIncendie', '5.4 Sécurité incendie', 37.5);

  addPlannedContentsEntry();
  addPlannedContentsEntry();
  addLawClimateSlide(pptx, slides, assets, coproprieteName, firstPageNumber);
  addPlannedContentsEntry();
  addDpeSlide(pptx, slides, data, assets, coproprieteName, firstPageNumber);
  addDpeScenarioSlide(pptx, slides, assets, coproprieteName, firstPageNumber);
  addPlannedContentsEntry();
  addCurativeIntroSlide(pptx, slides, assets, coproprieteName, firstPageNumber);
  const curativeSummary = buildPart3CurativeSummary(items);
  addPlannedContentsEntry();
  appendCurativeSummarySlides(pptx, slides, curativeSummary, assets, coproprieteName, firstPageNumber);
  addPlannedContentsEntry();
  addEnergySummarySlide(pptx, slides, assets, coproprieteName, firstPageNumber);

  addPlannedContentsEntry();
  addPlannedContentsEntry();
  addConclusionSlide(pptx, slides, curativeSummary, assets, coproprieteName, firstPageNumber);

  addPlannedContentsEntry();
  const financeSlides = PART3_SECTION_8_FINANCEMENTS_RENOVATION_ENERGETIQUE.diapositives as unknown as readonly StaticFinanceSlide[];
  financeSlides.forEach((content, index) => {
    addPlannedContentsEntry();
    addFinanceSlide(pptx, slides, assets, coproprieteName, firstPageNumber, content, index);
  });

  addPlannedContentsEntry();
  const lexicon = PART3_SECTION_9_LEXIQUE.diapositives;
  addPlannedContentsEntry();
  addLexiconSlide(pptx, slides, assets, coproprieteName, firstPageNumber, lexicon[0].definitions, lexicon[0].introduction);
  addPlannedContentsEntry();
  addLexiconSlide(pptx, slides, assets, coproprieteName, firstPageNumber, lexicon[1].definitions, undefined, true);

  addPlannedContentsEntry();
  addPlannedContentsEntry();
  addPlannedContentsEntry();
  addDeclarationAndAnnexSlide(pptx, slides, assets, coproprieteName, firstPageNumber);

  if (plannedContentsIndex !== plannedContents.length) {
    throw new Error('Le plan du sommaire Partie 3 contient des rubriques non rendues.');
  }
  return { slides, contents, curativeSummary };
}

async function responseToDataUrl(response: Response): Promise<string> {
  if (!response.ok) throw new Error('Impossible de charger un actif de présentation Partie 3.');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire un actif de présentation Partie 3.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de préparer le visuel DPE.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

async function loadOptionalStaticAsset(path: string): Promise<string | undefined> {
  const response = await fetch(path);
  if (!response.ok) return undefined;
  return responseToDataUrl(response);
}

/** Prepares only local browser assets; it never sends an image to Gemini or the API. */
export async function loadPart3PresentationAssets(data: Part3ReportData): Promise<Part3PresentationAssets> {
  const validation = validatePart3ReportData(data);
  if (!validation.isValid) throw new Error(`Partie 3 incomplète : ${validation.issues[0].message}`);
  const dpeVisuals: Part3PresentationAssets['dpeVisuals'] = {};
  await Promise.all(Object.entries(data.dpeCollectif.visuels).map(async ([role, file]) => {
    if (file) dpeVisuals[role as RoleVisuelDpePartie3] = { data: await fileToDataUrl(file) };
  }));
  const [
    logoData,
    defibrillatorData,
    dpeClassDData,
    dpeClassEData,
    dpeClassFData,
    dpeClassGData,
    maPrimeRenovLogoData,
    maPrimeRenovTableData,
    ceeLogoData,
    ecoPtzData,
    tvaData,
  ] = await Promise.all([
    fetch('/france-verte-logo.png').then(responseToDataUrl),
    loadOptionalStaticAsset('/part3/image2.png'),
    loadOptionalStaticAsset('/part3/image3.png'),
    loadOptionalStaticAsset('/part3/image4.png'),
    loadOptionalStaticAsset('/part3/image5.png'),
    loadOptionalStaticAsset('/part3/image6.png'),
    loadOptionalStaticAsset('/part3/image7.png'),
    loadOptionalStaticAsset('/part3/image8.png'),
    loadOptionalStaticAsset('/part3/image9.png'),
    loadOptionalStaticAsset('/part3/image10.jpg'),
    loadOptionalStaticAsset('/part3/image11.jpeg'),
  ]);
  return {
    logoData,
    dpeVisuals,
    staticAssets: {
      defibrillatorData,
      dpeClassDData,
      dpeClassEData,
      dpeClassFData,
      dpeClassGData,
      maPrimeRenovLogoData,
      maPrimeRenovTableData,
      ceeLogoData,
      ecoPtzData,
      tvaData,
    },
  };
}

/** Standalone developer/test generator. It is intentionally not wired to a user-facing export button yet. */
export async function buildPart3Pptx(
  data: Part3ReportData,
  items: readonly InspectionImageItem[],
  options: Part3AppendOptions = {},
): Promise<Blob> {
  const assets = await loadPart3PresentationAssets(data);
  const pptx = new pptxgen();
  pptx.author = 'France Verte';
  pptx.title = 'Partie 3 — Documentation et synthèse PPPT';
  appendPart3Slides(pptx, data, items, assets, options);
  const output = await pptx.write({ outputType: 'blob', compression: true });
  if (!(output instanceof Blob)) throw new Error('La génération du PPTX de la Partie 3 a échoué.');
  return normalizePptxPackage(output);
}
