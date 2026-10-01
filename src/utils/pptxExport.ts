import type { InspectionImageItem, DiagnosticNiveau } from '../types';
import { DIAGNOSTIC_NIVEAUX } from '../types';
import { isResultOutdated } from './analysisRetry';
import pptxgen from 'pptxgenjs';

// The supplied PPPT presentation uses an A4 portrait canvas.
const PAGE_W = 7559675 / 914400;
const PAGE_H = 10691813 / 914400;
const TABLE_X = 0.56;
const TABLE_W = PAGE_W - TABLE_X * 2;
const TABLE_TOP = 2.56;
const TABLE_TOP_WITHOUT_PRIORITY = 1.48;
const TABLE_BOTTOM = 10.91;
const FONT = 'Arial';
const BODY_SIZE = 10.5;
const BODY_LINE = 0.205;
const INK = '171717';
const BORDER = '2B2B2B';

const PRIORITY_COLORS: Record<DiagnosticNiveau, { fill: string; text: string; label: string; ribbon: string; detail: string }> = {
  Entretien: { fill: '54C4C5', text: 'FFFFFF', label: 'ENTRETIEN', ribbon: 'Entretien', detail: 'Opérations d\'entretien courant et de maintenance préventive nécessaires\nau maintien en bon état des équipements et du bâtiment.'},
  'Signalement hors PPPT à vérifier': { fill: '0874BD', text: 'FFFFFF', label: 'SIGNALEMENT', ribbon: 'Signalement', detail: 'Observations et points de vigilance relevés lors de la visite principalement\ndans les parties privatives.\nCes éléments sont présentés à titre informatif afin d\'attirer l\'attention des copropriétaires.'},
  'Curatif Niveau 1': { fill: 'D52234', text: 'FFFFFF', label: 'CURATIF NIVEAU 1', ribbon: 'Curatif Niveau 1', detail: 'Curatif Niveau 1 (impact fort) – Travaux à effectuer sous 2 ans (2027-2028)\nInterventions urgentes nécessaires à la sécurité des occupants, à la préservation du bâti\nou à la continuité de service des équipements.'},
  'Curatif Niveau 2': { fill: 'F97316', text: 'FFFFFF', label: 'CURATIF NIVEAU 2', ribbon: 'Curatif Niveau 2', detail: 'Curatif Niveau 2 (impact modéré) – Travaux à effectuer entre 3 et 5 ans\nInterventions à programmer afin d\'éviter une dégradation progressive\ndu bâtiment ou des équipements.'},
  'Curatif Niveau 3': { fill: '00BE84', text: 'FFFFFF', label: 'CURATIF NIVEAU 3', ribbon: 'Curatif Niveau 3', detail: 'Curatif Niveau 3 (impact faible) – Travaux à effectuer entre 6 et 10 ans\nInterventions correctives à programmer afin d\'éviter une dégradation progressive\ndu bâtiment ou des équipements.'},
  'Travaux énergétiques': { fill: '4EAD2B', text: 'FFFFFF', label: 'TRAVAUX ÉNERGÉTIQUES', ribbon: 'Travaux\nénergétiques', detail: 'Travaux visant à améliorer la performance énergétique du bâtiment,\nréduire les consommations d\'énergie et améliorer le confort thermique des occupants.'},
  'À confirmer / expertise nécessaire': { fill: 'FFC700', text: '594500', label: 'À CONFIRMER', ribbon: 'À confirmer', detail: 'Photo ou gravité incertaine' },
};

export function getExportableDiagnostics(items: readonly InspectionImageItem[]): InspectionImageItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.status === 'completed' && Boolean(item.result) && !isResultOutdated(item))
    .sort((a, b) => {
      const aRank = DIAGNOSTIC_NIVEAUX.indexOf(a.item.result!.priorite);
      const bRank = DIAGNOSTIC_NIVEAUX.indexOf(b.item.result!.priorite);
      return aRank - bRank || a.index - b.index;
    })
    .map(({ item }) => item);
}

type Presentation = pptxgen;
type Slide = ReturnType<Presentation['addSlide']>;

function addText(slide: Slide, text: string, x: number, y: number, w: number, h: number,
  extra: Parameters<Slide['addText']>[1] = {}) {
  slide.addText(text, {
    x, y, w, h, fontFace: FONT, fontSize: BODY_SIZE, color: INK,
    margin: 0, breakLine: false, valign: 'middle', wrap: false, ...extra,
  });
}

function addRectangle(slide: Slide, x: number, y: number, w: number, h: number,
  fill = 'FFFFFF', border = BORDER) {
  slide.addShape('rect', {
    x, y, w, h, line: { color: border, width: 0.65 }, fill: { color: fill },
  });
}

function measureLine(text: string, fontSizePt: number): number {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = `${fontSizePt * 96 / 72}px ${FONT}`;
      return context.measureText(text).width / 96;
    }
  }
  // Conservative fallback for server-side validation.
  return [...text].reduce((sum, char) => sum + (/[il.,:;!| ]/.test(char) ? 0.035 : 0.078), 0)
    * fontSizePt / BODY_SIZE;
}

function wrapLines(text: string, availableWidth: number, fontSizePt = BODY_SIZE): string[] {
  const result: string[] = [];
  const width = availableWidth * 0.94;
  for (const paragraph of text.replace(/\r\n/g, '\n').split('\n')) {
    if (!paragraph.trim()) { result.push(''); continue; }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measureLine(candidate, fontSizePt) <= width) {
        line = candidate;
      } else {
        if (line) result.push(line);
        if (measureLine(word, fontSizePt) <= width) { line = word; continue; }
        // Long unbroken tokens are rare in diagnostics, but must not escape the page.
        let chunk = '';
        for (const character of word) {
          if (chunk && measureLine(chunk + character, fontSizePt) > width) {
            result.push(chunk);
            chunk = character;
          } else chunk += character;
        }
        line = chunk;
      }
    }
    result.push(line);
  }
  return result;
}

function addPageHeader(pptx: Presentation, slides: Slide[], item: InspectionImageItem, number: number,
  logoData: string, showPriorityIntro: boolean): { slide: Slide; y: number } {
  const slide = pptx.addSlide();
  slides.push(slide);
  slide.background = { color: 'FFFFFF' };
  slide.addImage({ data: logoData, x: TABLE_X, y: 0.18, w: 2.38, h: 0.60,
    altText: 'France Verte, bureau d’études fluides et thermiques' });
  slide.addShape('rect', { x: TABLE_X, y: 0.90, w: TABLE_W, h: 0.34,
    line: { color: '00B55A', transparency: 100 }, fill: { color: '00B55A' } });
  addText(slide, '2.IDENTIFICATION ET HIÉRARCHISATION DES TRAVAUX ET OBSERVATIONS',
    TABLE_X + 0.14, 0.93, TABLE_W - 0.25, 0.26,
    { fontSize: 11.5, bold: true, color: 'FFFFFF' });
  const priority = PRIORITY_COLORS[item.result!.priorite];
  if (showPriorityIntro) {
    slide.addShape('chevron', { x: TABLE_X, y: 1.76, w: 1.75, h: 0.47,
      line: { color: BORDER, width: 0.8 }, fill: { color: priority.fill } });
    addText(slide, priority.ribbon, TABLE_X + 0.07, 1.80, 1.43, 0.38,
      { fontSize: priority.ribbon.length > 17 ? 9.0 : 10.0,
        bold: true, color: priority.text, align: 'center', wrap: true });
    addText(slide, priority.detail, TABLE_X + 1.99, 1.55, TABLE_W - 2.05, 0.89,
      { fontSize: 8.3, bold: true, valign: 'middle', wrap: true, lineSpacingMultiple: 1.0 });
  }

  const tableTop = showPriorityIntro ? TABLE_TOP : TABLE_TOP_WITHOUT_PRIORITY;
  const col1 = 0.80;
  const col3 = 2.42;
  const col2 = TABLE_W - col1 - col3;
  const familyLines = wrapLines(`Famille : ${item.result!.famille}`, col2 - 0.20, 10.2);
  const headingHeight = Math.max(0.48, familyLines.length * 0.195 + 0.16);
  addRectangle(slide, TABLE_X, tableTop, col1, headingHeight);
  addRectangle(slide, TABLE_X + col1, tableTop, col2, headingHeight);
  addRectangle(slide, TABLE_X + col1 + col2, tableTop, col3, headingHeight, priority.fill);
  addText(slide, `N°${number}`, TABLE_X + 0.04, tableTop + (headingHeight - 0.24) / 2, col1 - 0.08, 0.24,
    { bold: true, align: 'center' });
  addText(slide, familyLines.join('\n'), TABLE_X + col1 + 0.08,
    tableTop + 0.08, col2 - 0.16, headingHeight - 0.16, { bold: true, fontSize: 10.2 });
  addText(slide, priority.label, TABLE_X + col1 + col2 + 0.06,
    tableTop + (headingHeight - 0.31) / 2, col3 - 0.12, 0.31,
    { bold: true, color: priority.text, align: 'center', fontSize: priority.label.length > 19 ? 9.7 : 10.5 });
  return { slide, y: tableTop + headingHeight };
}

function addBodyRow(slide: Slide, label: string, lines: string[], y: number): number {
  const contentHeight = Math.max(BODY_LINE, lines.length * BODY_LINE);
  const height = 0.37 + contentHeight + 0.09;
  addRectangle(slide, TABLE_X, y, TABLE_W, height);
  addText(slide, `${label} :`, TABLE_X + 0.08, y + 0.07, TABLE_W - 0.16, 0.19,
    { bold: true, fontSize: 10.1 });
  addText(slide, lines.join('\n'), TABLE_X + 0.08, y + 0.31, TABLE_W - 0.16,
    contentHeight + 0.04, { valign: 'top', breakLine: false, lineSpacingMultiple: 1.0 });
  return y + height;
}

function addCostRow(slide: Slide, min: number, max: number, y: number): number {
  const hasCost = min > 0;
  const amount = hasCost
    ? min === max
      ? `${new Intl.NumberFormat('fr-FR').format(min)} € TTC`
      : `${new Intl.NumberFormat('fr-FR').format(min)} à ${new Intl.NumberFormat('fr-FR').format(max)} € TTC`
    : 'À déterminer après visite et définition des travaux.';
  const height = hasCost ? 0.84 : 0.64;
  addRectangle(slide, TABLE_X, y, TABLE_W, height);
  addText(slide, 'Chiffrage estimatif :', TABLE_X + 0.08, y + 0.06, TABLE_W - 0.16, 0.19,
    { bold: true, fontSize: 10.1 });
  addText(slide, `Coût estimé : ${amount}`, TABLE_X + 0.10, y + 0.29, TABLE_W - 0.20, 0.23,
    { align: 'center', bold: true, fontSize: 10.2 });
  if (hasCost) addText(slide,
    'Estimation IA indicative, susceptible d’être ajustée après consultation des entreprises',
    TABLE_X + 0.10, y + 0.55, TABLE_W - 0.20, 0.17,
    { align: 'center', italic: true, fontSize: 9.0, color: '626262' });
  return y + height;
}

function addIllustration(slide: Slide, imageData: string, imageW: number,
  imageH: number, y: number, number: number): void {
  const height = Math.min(4.30, TABLE_BOTTOM - y);
  addRectangle(slide, TABLE_X, y, TABLE_W, height);
  addText(slide, 'Illustrations :', TABLE_X + 0.08, y + 0.07, TABLE_W - 0.16, 0.19,
    { bold: true, fontSize: 10.1 });
  const maxW = TABLE_W - 0.28;
  const maxH = height - 0.43;
  const scale = Math.min(maxW / imageW, maxH / imageH);
  const w = imageW * scale;
  const h = imageH * scale;
  slide.addImage({ data: imageData, x: TABLE_X + (TABLE_W - w) / 2,
    y: y + 0.34 + (maxH - h) / 2, w, h,
    altText: `Photographie du diagnostic n°${number}` });
}

async function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire une image à exporter.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function preparePhoto(file: File): Promise<{ data: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxSide = 2200;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Le navigateur ne peut pas préparer les illustrations.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL('image/jpeg', 0.88), width: canvas.width, height: canvas.height };
  } finally {
    bitmap.close();
  }
}

interface PreparedPhoto {
  data: string;
  width: number;
  height: number;
}

/** Creates native PowerPoint text and shapes; asset loading stays separate from layout. */
export async function renderDiagnosticPptx(
  items: readonly InspectionImageItem[],
  logoData: string,
  loadPhoto: (file: File) => Promise<PreparedPhoto>,
): Promise<Blob> {
  const exportable = getExportableDiagnostics(items);
  if (exportable.length === 0) throw new Error('Aucun diagnostic terminé et à jour à exporter.');
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'A4_PORTRAIT', width: PAGE_W, height: PAGE_H });
  pptx.layout = 'A4_PORTRAIT';
  pptx.author = 'France Verte';
  pptx.subject = 'Diagnostics techniques du bâtiment';
  pptx.title = 'Diagnostic Technique Bâtiment';
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };
  const slides: Slide[] = [];

  for (let index = 0; index < exportable.length; index += 1) {
    const item = exportable[index];
    const result = item.result!;
    const number = index + 1;
    const startsPriority = index === 0 || exportable[index - 1].result!.priorite !== result.priorite;
    let { slide, y } = addPageHeader(pptx, slides, item, number, logoData, startsPriority);
    const fields = [
      { label: 'Localisation', text: result.localisation },
      { label: 'Etat / Observations', text: result.etat_observations },
      { label: result.priorite === 'Entretien' || result.priorite === 'Signalement hors PPPT à vérifier'
        ? 'Recommandations' : 'Travaux à effectuer', text: result.intervention },
    ];
    for (const field of fields) {
      const lines = wrapLines(field.text, TABLE_W - 0.20);
      let cursor = 0;
      while (cursor < lines.length) {
        const capacity = Math.floor((TABLE_BOTTOM - y - 0.47) / BODY_LINE);
        if (capacity < 1) {
          ({ slide, y } = addPageHeader(pptx, slides, item, number, logoData, false));
          continue;
        }
        const chunk = lines.slice(cursor, cursor + capacity);
        y = addBodyRow(slide, cursor ? `${field.label} (suite)` : field.label, chunk, y);
        cursor += chunk.length;
        if (cursor < lines.length) ({ slide, y } = addPageHeader(pptx, slides, item, number, logoData, false));
      }
    }
    if (result.priorite !== 'Entretien' && result.priorite !== 'Signalement hors PPPT à vérifier') {
      const costHeight = result.cout_estime_min_ttc_eur > 0 ? 0.84 : 0.64;
      if (y + costHeight > TABLE_BOTTOM) ({ slide, y } = addPageHeader(pptx, slides, item, number, logoData, false));
      y = addCostRow(slide, result.cout_estime_min_ttc_eur, result.cout_estime_max_ttc_eur, y);
    }
    if (TABLE_BOTTOM - y < 2.40) ({ slide, y } = addPageHeader(pptx, slides, item, number, logoData, false));
    const photo = await loadPhoto(item.file);
    addIllustration(slide, photo.data, photo.width, photo.height, y, number);
  }
  slides.forEach((slide, index) => {
    addText(slide, 'Diagnostic Technique Bâtiment · France Verte',
      2.42, PAGE_H - 0.33, 3.5, 0.16,
      { fontSize: 8.3, align: 'center', color: '777777' });
    addText(slide, String(index + 1), PAGE_W - TABLE_X - 0.3,
      PAGE_H - 0.33, 0.3, 0.16,
      { fontSize: 8.3, align: 'right', color: '777777' });
  });
  const output = await pptx.write({ outputType: 'blob', compression: true });
  if (!(output instanceof Blob)) throw new Error('La génération du fichier PPTX a échoué.');
  return output;
}

/** Creates an editable A4 PowerPoint from the same diagnostic data shown on screen. */
export async function buildDiagnosticPptx(items: readonly InspectionImageItem[]): Promise<Blob> {
  if (getExportableDiagnostics(items).length === 0) {
    throw new Error('Aucun diagnostic terminé et à jour à exporter.');
  }
  const logoResponse = await fetch('/france-verte-logo.png');
  if (!logoResponse.ok) throw new Error('Le logo France Verte est indisponible.');
  const logoData = await readBlobAsDataUrl(await logoResponse.blob());
  return renderDiagnosticPptx(items, logoData, preparePhoto);
}
