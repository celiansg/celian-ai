import { PDFDocument } from "pdf-lib";

export type BleedMethod = "edge_repeat" | "mirror" | "blank";
export type BleedOptions = { bleedMm: number; dpi: 150 | 300; method: BleedMethod; pages: "all" | number };
export type BleedResult = { bytes: Uint8Array; pageCount: number; bleedMm: number; dpi: number; method: BleedMethod; rasterized: true; warning: string };

const maxInputBytes = 15 * 1024 * 1024;
const maxBleedMm = 20;
const pointsPerMm = 72 / 25.4;

function mmToPoints(value: number) { return value * pointsPerMm; }

export function calculateBleedOutput(widthPt: number, heightPt: number, bleedMm: number) {
  if (!Number.isFinite(widthPt) || !Number.isFinite(heightPt) || widthPt <= 0 || heightPt <= 0) throw new Error("Le format de page est invalide.");
  if (!Number.isFinite(bleedMm) || bleedMm <= 0 || bleedMm > maxBleedMm) throw new Error(`Le fond perdu doit être compris entre 0,1 et ${maxBleedMm} mm.`);
  const bleedPt = mmToPoints(bleedMm);
  return { trimWidthPt: widthPt, trimHeightPt: heightPt, bleedPt, outputWidthPt: widthPt + bleedPt * 2, outputHeightPt: heightPt + bleedPt * 2 };
}

function drawEdgeRepeat(context: CanvasRenderingContext2D, source: HTMLCanvasElement, bleedX: number, bleedY: number) {
  const width = source.width;
  const height = source.height;
  context.drawImage(source, 0, 0, 1, 1, 0, 0, bleedX, bleedY);
  context.drawImage(source, width - 1, 0, 1, 1, bleedX + width, 0, bleedX, bleedY);
  context.drawImage(source, 0, height - 1, 1, 1, 0, bleedY + height, bleedX, bleedY);
  context.drawImage(source, width - 1, height - 1, 1, 1, bleedX + width, bleedY + height, bleedX, bleedY);
  context.drawImage(source, 0, 0, width, 1, bleedX, 0, width, bleedY);
  context.drawImage(source, 0, height - 1, width, 1, bleedX, bleedY + height, width, bleedY);
  context.drawImage(source, 0, 0, 1, height, 0, bleedY, bleedX, height);
  context.drawImage(source, width - 1, 0, 1, height, bleedX + width, bleedY, bleedX, height);
}

function drawMirror(context: CanvasRenderingContext2D, source: HTMLCanvasElement, bleedX: number, bleedY: number) {
  const width = source.width;
  const height = source.height;
  const mirror = (sourceX: number, sourceY: number, boundaryX: number, boundaryY: number, targetX: number, targetY: number, targetWidth: number, targetHeight: number, flipX: boolean, flipY: boolean) => {
    context.save();
    context.translate(boundaryX, boundaryY);
    context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    context.drawImage(source, sourceX, sourceY, targetWidth, targetHeight, targetX, targetY, targetWidth, targetHeight);
    context.restore();
  };
  // Corners first: they are reflected on both axes so no blank pixel remains at a join.
  mirror(0, 0, bleedX, bleedY, 0, 0, bleedX, bleedY, true, true);
  mirror(width - bleedX, 0, bleedX + width, bleedY, -bleedX, 0, bleedX, bleedY, true, true);
  mirror(0, height - bleedY, bleedX, bleedY + height, 0, -bleedY, bleedX, bleedY, true, true);
  mirror(width - bleedX, height - bleedY, bleedX + width, bleedY + height, -bleedX, -bleedY, bleedX, bleedY, true, true);
  // The four edges are reflected around the Trim boundary.
  mirror(0, 0, bleedX, bleedY, bleedX, 0, width, bleedY, false, true);
  mirror(0, height - bleedY, bleedX, bleedY + height, bleedX, -bleedY, width, bleedY, false, true);
  mirror(0, 0, bleedX, bleedY, 0, bleedY, bleedX, height, true, false);
  mirror(width - bleedX, 0, bleedX + width, bleedY, -bleedX, bleedY, bleedX, height, true, false);
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) { reject(new Error("La rasterisation du fond perdu a échoué.")); return; }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
}

export async function addBleedToPdf(file: File, options: BleedOptions): Promise<BleedResult> {
  if (!file.name.toLowerCase().endsWith(".pdf") || file.size > maxInputBytes) throw new Error("Sélectionnez un PDF de 15 Mo maximum.");
  if (!Number.isFinite(options.bleedMm) || options.bleedMm <= 0 || options.bleedMm > maxBleedMm) throw new Error(`Le fond perdu doit être compris entre 0,1 et ${maxBleedMm} mm.`);
  if (![150, 300].includes(options.dpi)) throw new Error("La résolution doit être de 150 ou 300 DPI.");
  if (options.pages !== "all" && (!Number.isInteger(options.pages) || options.pages < 1)) throw new Error("La page sélectionnée est invalide.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") throw new Error("Le fichier sélectionné ne contient pas de PDF valide.");

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const source = await pdfjs.getDocument({ data: bytes }).promise;
  const sourcePages = options.pages === "all" ? Array.from({ length: source.numPages }, (_, index) => index + 1) : [options.pages];
  if (sourcePages.some((page) => page > source.numPages)) { await source.destroy(); throw new Error("La page sélectionnée n’existe pas dans le PDF."); }

  const output = await PDFDocument.create();
  try {
    for (const pageNumber of sourcePages) {
      const page = await source.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = options.dpi / 72;
      const viewport = page.getViewport({ scale });
      const width = Math.ceil(viewport.width);
      const height = Math.ceil(viewport.height);
      const bleedPx = Math.ceil(mmToPoints(options.bleedMm) * scale);
      if ((width + bleedPx * 2) * (height + bleedPx * 2) > 18_000_000) throw new Error(`La page ${pageNumber} dépasse la limite de pixels de sécurité à ${options.dpi} DPI.`);
      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = width; sourceCanvas.height = height;
      const sourceContext = sourceCanvas.getContext("2d", { alpha: false });
      if (!sourceContext) throw new Error("Le navigateur ne peut pas rasteriser ce PDF.");
      sourceContext.fillStyle = "#ffffff"; sourceContext.fillRect(0, 0, width, height);
      await page.render({ canvasContext: sourceContext, viewport }).promise;

      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = width + bleedPx * 2; outputCanvas.height = height + bleedPx * 2;
      const outputContext = outputCanvas.getContext("2d", { alpha: false });
      if (!outputContext) throw new Error("Le navigateur ne peut pas créer la page avec fond perdu.");
      outputContext.fillStyle = "#ffffff"; outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
      if (options.method === "edge_repeat") drawEdgeRepeat(outputContext, sourceCanvas, bleedPx, bleedPx);
      if (options.method === "mirror") drawMirror(outputContext, sourceCanvas, bleedPx, bleedPx);
      outputContext.drawImage(sourceCanvas, bleedPx, bleedPx);

      const image = await output.embedPng(await canvasToPng(outputCanvas));
      const dimensions = calculateBleedOutput(baseViewport.width, baseViewport.height, options.bleedMm);
      const outputPage = output.addPage([dimensions.outputWidthPt, dimensions.outputHeightPt]);
      outputPage.drawImage(image, { x: 0, y: 0, width: dimensions.outputWidthPt, height: dimensions.outputHeightPt });
      outputPage.setCropBox(0, 0, dimensions.outputWidthPt, dimensions.outputHeightPt);
      outputPage.setTrimBox(dimensions.bleedPt, dimensions.bleedPt, dimensions.trimWidthPt, dimensions.trimHeightPt);
      outputPage.setBleedBox(0, 0, dimensions.outputWidthPt, dimensions.outputHeightPt);
    }
  } finally { await source.destroy(); }
  return { bytes: await output.save({ useObjectStreams: false }), pageCount: sourcePages.length, bleedMm: options.bleedMm, dpi: options.dpi, method: options.method, rasterized: true, warning: "Sortie rasterisée : contrôlez les petits textes, QR codes, transparences et profils colorimétriques avant production." };
}
