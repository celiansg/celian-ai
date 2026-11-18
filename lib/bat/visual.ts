import { degrees, PDFArray, PDFDocument, PDFName, type PDFPage } from "pdf-lib";
import mapping from "../../knowledge/templates/BAT-template.mapping.v1.json";

const maximumBytes = 15 * 1024 * 1024;
const maximumPages = 50;

export async function openBatVisual(file: File) {
  if (!file.name.toLowerCase().endsWith(".pdf") || file.size > maximumBytes) {
    throw new Error("Sélectionnez un PDF de 15 Mo maximum.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    throw new Error("Le fichier sélectionné ne contient pas de PDF valide.");
  }
  const document = await PDFDocument.load(bytes);
  if (document.getPageCount() < 1 || document.getPageCount() > maximumPages) {
    throw new Error("Le PDF doit contenir entre 1 et 50 pages.");
  }
  return document;
}

async function drawVisual(output: PDFPage, sourcePage: PDFPage, pageNumber: number) {
  const crop = sourcePage.getCropBox();
  if (![crop.x, crop.y, crop.width, crop.height].every(Number.isFinite) || crop.width <= 0 || crop.height <= 0) {
    throw new Error(`La zone visible de la page ${pageNumber} est invalide.`);
  }
  const rotation = ((sourcePage.getRotation().angle % 360) + 360) % 360;
  if (![0, 90, 180, 270].includes(rotation)) throw new Error(`La rotation de la page ${pageNumber} est invalide.`);
  if (!sourcePage.node.Contents()) return; // Keep intentionally blank pages in the source order.
  const visual = await output.doc.embedPage(sourcePage, {
    left: crop.x, bottom: crop.y, right: crop.x + crop.width, top: crop.y + crop.height,
  });

  const zone = mapping.visual;
  const swapped = rotation === 90 || rotation === 270;
  const rotatedWidth = swapped ? crop.height : crop.width;
  const rotatedHeight = swapped ? crop.width : crop.height;
  const scale = Math.min(zone.width / rotatedWidth, zone.height / rotatedHeight);
  const left = zone.x + (zone.width - rotatedWidth * scale) / 2;
  const bottom = zone.y + (zone.height - rotatedHeight * scale) / 2;
  output.drawPage(visual, {
    x: left + (rotation === 180 || rotation === 270 ? rotatedWidth * scale : 0),
    y: bottom + (rotation === 90 || rotation === 180 ? rotatedHeight * scale : 0),
    xScale: scale,
    yScale: scale,
    rotate: degrees(-rotation),
  });
}

export async function placeBatVisual(draft: ArrayBuffer, source: PDFDocument, selection: number | "all") {
  const sourceCount = source.getPageCount();
  if (sourceCount < 1 || sourceCount > maximumPages) throw new Error("Le PDF doit contenir entre 1 et 50 pages.");
  if (selection !== "all" && (!Number.isInteger(selection) || selection < 1 || selection > sourceCount)) {
    throw new Error("Sélectionnez une page du PDF client.");
  }

  const sourcePages = selection === "all"
    ? Array.from({ length: sourceCount }, (_, index) => index + 1)
    : [selection];
  const document = await PDFDocument.load(draft);
  if (document.getPageCount() !== 1) throw new Error("Le modèle rempli doit contenir une seule page.");

  // Copy while the template page still contains only the shared fields.
  const copies = sourcePages.length > 1
    ? await document.copyPages(document, sourcePages.slice(1).map(() => 0))
    : [];
  const outputPages = [document.getPage(0), ...copies.map((copy) => document.addPage(copy))];
  for (const [index, sourcePage] of sourcePages.entries()) {
    const output = outputPages[index];
    const contents = output.node.Contents();
    // Copied pages may share the same stream array. Each page needs its own visual.
    if (contents instanceof PDFArray) output.node.set(PDFName.Contents, contents.clone(document.context));
    await drawVisual(output, source.getPage(sourcePage - 1), sourcePage);
  }

  return document.save({ useObjectStreams: false });
}
