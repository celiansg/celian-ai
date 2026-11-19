import { degrees, PDFArray, PDFDocument, PDFName, type PDFPage } from "pdf-lib";
import { batVisualZone } from "./visual-mapping.ts";

export async function openBatVisual(file: File) {
  if (!file.name.toLowerCase().endsWith(".pdf")) throw new Error("Sélectionnez un fichier PDF.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    throw new Error("Le fichier sélectionné ne contient pas de PDF valide.");
  }
  const document = await PDFDocument.load(bytes);
  if (document.getPageCount() < 1) throw new Error("Le PDF ne contient aucune page.");
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

  const zone = batVisualZone;
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
  const sourcePages = selection === "all"
    ? Array.from({ length: source.getPageCount() }, (_, index) => ({ sourceIndex: 0, page: index + 1 }))
    : [{ sourceIndex: 0, page: selection }];
  return placeBatVisuals(draft, [source], sourcePages);
}

export async function placeBatVisuals(
  draft: ArrayBuffer,
  sources: PDFDocument[],
  selections: { sourceIndex: number; page: number }[],
) {
  if (!sources.length || !selections.length) throw new Error("Sélectionnez au moins un visuel PDF.");
  for (const source of sources) {
    const sourceCount = source.getPageCount();
    if (sourceCount < 1) throw new Error("Un PDF ne contient aucune page.");
  }
  if (selections.some(({ sourceIndex, page }) => sourceIndex < 0 || sourceIndex >= sources.length
    || !Number.isInteger(page) || page < 1 || page > sources[sourceIndex].getPageCount())) {
    throw new Error("Une page sélectionnée n’existe pas dans un PDF client.");
  }

  const document = await PDFDocument.load(draft);
  if (document.getPageCount() !== 1) throw new Error("Le modèle rempli doit contenir une seule page.");

  // Copy while the template page still contains only the shared fields.
  const copies = selections.length > 1
    ? await document.copyPages(document, selections.slice(1).map(() => 0))
    : [];
  const outputPages = [document.getPage(0), ...copies.map((copy) => document.addPage(copy))];
  for (const [index, selection] of selections.entries()) {
    const output = outputPages[index];
    const contents = output.node.Contents();
    // Copied pages may share the same stream array. Each page needs its own visual.
    if (contents instanceof PDFArray) output.node.set(PDFName.Contents, contents.clone(document.context));
    await drawVisual(output, sources[selection.sourceIndex].getPage(selection.page - 1), selection.page);
  }

  return document.save({ useObjectStreams: false });
}
