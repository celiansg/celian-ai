import { PDFDocument, type PDFPage } from "pdf-lib";

const POINTS_PER_MM = 72 / 25.4;
const mmToPoints = (value: number) => value * POINTS_PER_MM;

export type ImpositionMode = "n_up" | "step_repeat";

export type ImpositionOptions = {
  sheetWidthMm: number;
  sheetHeightMm: number;
  columns: number;
  rows: number;
  gutterMm: number;
  marginMm: number;
  mode: ImpositionMode;
  sourcePage?: number;
};

export type ImpositionResult = {
  bytes: Uint8Array;
  outputPages: number;
  placedPages: number;
  sheet: { widthMm: number; heightMm: number };
  mode: ImpositionMode;
  warning: string;
};

function validate(options: ImpositionOptions) {
  if (![options.sheetWidthMm, options.sheetHeightMm, options.gutterMm, options.marginMm].every(Number.isFinite)) throw new Error("Les dimensions d’imposition sont invalides.");
  if (options.sheetWidthMm <= 0 || options.sheetHeightMm <= 0 || options.sheetWidthMm > 1000 || options.sheetHeightMm > 1000) throw new Error("La feuille doit mesurer entre 0,1 et 1 000 mm.");
  if (options.columns < 1 || options.columns > 10 || options.rows < 1 || options.rows > 10) throw new Error("La grille doit contenir entre 1 et 10 colonnes et lignes.");
  if (options.gutterMm < 0 || options.gutterMm > 100) throw new Error("Le blanc entre poses doit être compris entre 0 et 100 mm.");
  if (options.marginMm < 0 || options.marginMm > 100) throw new Error("La marge doit être comprise entre 0 et 100 mm.");
  const cellWidth = (options.sheetWidthMm - options.marginMm * 2 - options.gutterMm * (options.columns - 1)) / options.columns;
  const cellHeight = (options.sheetHeightMm - options.marginMm * 2 - options.gutterMm * (options.rows - 1)) / options.rows;
  if (cellWidth <= 0 || cellHeight <= 0) throw new Error("La grille dépasse les dimensions de la feuille.");
}

function fit(source: PDFPage, cellWidth: number, cellHeight: number) {
  const sourceWidth = source.getWidth();
  const sourceHeight = source.getHeight();
  const scale = Math.min(cellWidth / sourceWidth, cellHeight / sourceHeight);
  return { width: sourceWidth * scale, height: sourceHeight * scale };
}

export async function imposePdf(bytes: Uint8Array, options: ImpositionOptions): Promise<ImpositionResult> {
  validate(options);
  const source = await PDFDocument.load(bytes, { updateMetadata: false });
  const pageCount = source.getPageCount();
  if (pageCount < 1) throw new Error("Le PDF ne contient aucune page.");
  const selected = options.mode === "step_repeat"
    ? [Math.min(Math.max((options.sourcePage ?? 1) - 1, 0), pageCount - 1)]
    : Array.from({ length: pageCount }, (_, index) => index);
  const output = await PDFDocument.create();
  const embedded = await Promise.all(selected.map((index) => output.embedPage(source.getPage(index))));
  const sheetWidth = mmToPoints(options.sheetWidthMm);
  const sheetHeight = mmToPoints(options.sheetHeightMm);
  const cellWidth = mmToPoints((options.sheetWidthMm - options.marginMm * 2 - options.gutterMm * (options.columns - 1)) / options.columns);
  const cellHeight = mmToPoints((options.sheetHeightMm - options.marginMm * 2 - options.gutterMm * (options.rows - 1)) / options.rows);
  const perSheet = options.columns * options.rows;
  const outputPages = Math.ceil(embedded.length / perSheet);
  for (let sheetIndex = 0; sheetIndex < outputPages; sheetIndex += 1) {
    const page = output.addPage([sheetWidth, sheetHeight]);
    for (let slot = 0; slot < perSheet; slot += 1) {
      const embeddedPage = embedded[sheetIndex * perSheet + slot];
      if (!embeddedPage) continue;
      const sourcePage = source.getPage(selected[sheetIndex * perSheet + slot] ?? selected[0]);
      const size = fit(sourcePage, cellWidth, cellHeight);
      const column = slot % options.columns;
      const row = Math.floor(slot / options.columns);
      const x = mmToPoints(options.marginMm + column * ((options.sheetWidthMm - options.marginMm * 2 - options.gutterMm * (options.columns - 1)) / options.columns + options.gutterMm)) + (cellWidth - size.width) / 2;
      const y = sheetHeight - mmToPoints(options.marginMm + (row + 1) * ((options.sheetHeightMm - options.marginMm * 2 - options.gutterMm * (options.rows - 1)) / options.rows) + row * options.gutterMm) + (cellHeight - size.height) / 2;
      page.drawPage(embeddedPage, { x, y, width: size.width, height: size.height });
    }
  }
  output.setTitle("Imposition · Agents");
  output.setAuthor("Agents");
  return { bytes: await output.save({ useObjectStreams: false }), outputPages, placedPages: embedded.length * (options.mode === "step_repeat" ? perSheet : 1), sheet: { widthMm: options.sheetWidthMm, heightMm: options.sheetHeightMm }, mode: options.mode, warning: "Imposition vectorielle simple : aucun repère, fond perdu, séparation ou compensation machine n’est ajoutée automatiquement." };
}
