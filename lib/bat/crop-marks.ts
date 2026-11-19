import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import { mmToPoints } from "./preflight.ts";

export type CropMarksPages = "all" | number;

export type CropMarksOptions = {
  markLengthMm: number;
  offsetMm: number;
  lineWidthPt: number;
  pages: CropMarksPages;
};

export type CropMarksResult = {
  bytes: Uint8Array;
  pageCount: number;
  pages: number[];
  operation: "add_marks" | "trim_to_finished";
  warning: string;
};

function positive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0 || value > 1000) throw new Error(`${label} doit être supérieur à 0 et inférieur à 1 000.`);
  return value;
}

function pageIndexes(pageCount: number, pages: CropMarksPages) {
  const indexes = pages === "all" ? Array.from({ length: pageCount }, (_, index) => index) : [pages - 1];
  if (indexes.some((index) => index < 0 || index >= pageCount)) throw new Error("Le numéro de page demandé n’existe pas.");
  return indexes;
}

function drawMark(page: PDFPage, x1: number, y1: number, x2: number, y2: number, lineWidthPt: number) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: lineWidthPt, color: rgb(0, 0, 0) });
}

function drawCropMarks(page: PDFPage, trimX: number, trimY: number, trimWidth: number, trimHeight: number, options: CropMarksOptions) {
  const length = mmToPoints(options.markLengthMm);
  const offset = mmToPoints(options.offsetMm);
  const right = trimX + trimWidth;
  const top = trimY + trimHeight;
  const lineWidthPt = options.lineWidthPt;

  drawMark(page, trimX - offset - length, trimY - offset, trimX - offset, trimY - offset, lineWidthPt);
  drawMark(page, trimX - offset, trimY - offset - length, trimX - offset, trimY - offset, lineWidthPt);
  drawMark(page, right + offset, trimY - offset, right + offset + length, trimY - offset, lineWidthPt);
  drawMark(page, right + offset, trimY - offset - length, right + offset, trimY - offset, lineWidthPt);
  drawMark(page, trimX - offset - length, top + offset, trimX - offset, top + offset, lineWidthPt);
  drawMark(page, trimX - offset, top + offset, trimX - offset, top + offset + length, lineWidthPt);
  drawMark(page, right + offset, top + offset, right + offset + length, top + offset, lineWidthPt);
  drawMark(page, right + offset, top + offset, right + offset, top + offset + length, lineWidthPt);
}

export async function addCropMarksToPdf(bytes: Uint8Array, options: CropMarksOptions): Promise<CropMarksResult> {
  positive(options.markLengthMm, "La longueur des traits");
  if (!Number.isFinite(options.offsetMm) || options.offsetMm < 0 || options.offsetMm > 1000) throw new Error("Le décalage doit être compris entre 0 et 1 000 mm.");
  if (!Number.isFinite(options.lineWidthPt) || options.lineWidthPt <= 0 || options.lineWidthPt > 20) throw new Error("L’épaisseur des traits doit être comprise entre 0,01 et 20 pt.");
  const source = await PDFDocument.load(bytes, { updateMetadata: false });
  const indexes = pageIndexes(source.getPageCount(), options.pages);
  const output = await PDFDocument.create();
  const margin = mmToPoints(options.markLengthMm + options.offsetMm + 2);

  for (const index of indexes) {
    const sourcePage = source.getPage(index);
    const media = sourcePage.getMediaBox();
    const trim = sourcePage.getTrimBox();
    const page = output.addPage([media.width + margin * 2, media.height + margin * 2]);
    if (sourcePage.node.Contents()) {
      const embedded = await output.embedPage(sourcePage, { left: media.x, bottom: media.y, right: media.x + media.width, top: media.y + media.height });
      page.drawPage(embedded, { x: margin, y: margin });
    }
    const trimX = margin + trim.x - media.x;
    const trimY = margin + trim.y - media.y;
    page.setTrimBox(trimX, trimY, trim.width, trim.height);
    drawCropMarks(page, trimX, trimY, trim.width, trim.height, options);
  }

  output.setTitle("Traits de coupe · Agents");
  output.setAuthor("Agents");
  return {
    bytes: await output.save({ useObjectStreams: false }),
    pageCount: indexes.length,
    pages: indexes.map((index) => index + 1),
    operation: "add_marks",
    warning: "Traits de coupe vectoriels ajoutés autour de la TrimBox. Vérifiez le décalage et le format fini avant production.",
  };
}

export async function trimPdfToFinished(bytes: Uint8Array, pages: CropMarksPages = "all"): Promise<CropMarksResult> {
  const source = await PDFDocument.load(bytes, { updateMetadata: false });
  const indexes = pageIndexes(source.getPageCount(), pages);
  const output = await PDFDocument.create();

  for (const index of indexes) {
    const sourcePage = source.getPage(index);
    const trim = sourcePage.getTrimBox();
    if (![trim.x, trim.y, trim.width, trim.height].every(Number.isFinite) || trim.width <= 0 || trim.height <= 0) throw new Error(`La zone de rognage de la page ${index + 1} est invalide.`);
    const page = output.addPage([trim.width, trim.height]);
    if (sourcePage.node.Contents()) {
      const embedded = await output.embedPage(sourcePage, { left: trim.x, bottom: trim.y, right: trim.x + trim.width, top: trim.y + trim.height });
      page.drawPage(embedded, { x: 0, y: 0 });
    }
    page.setCropBox(0, 0, trim.width, trim.height);
    page.setTrimBox(0, 0, trim.width, trim.height);
  }

  output.setTitle("PDF rogné au format fini · Agents");
  output.setAuthor("Agents");
  return {
    bytes: await output.save({ useObjectStreams: false }),
    pageCount: indexes.length,
    pages: indexes.map((index) => index + 1),
    operation: "trim_to_finished",
    warning: "Les éléments situés hors de la TrimBox ont été retirés de la nouvelle copie. Le PDF original reste inchangé.",
  };
}
