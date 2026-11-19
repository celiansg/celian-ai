import { degrees, PDFArray, PDFDocument, PDFName, rgb, StandardFonts, type PDFPage } from "pdf-lib";
import { batVisualZone } from "./visual-mapping.ts";

export type BatVisualLayout = "one_per_page" | "recto_verso";
type VisualBox = { x: number; y: number; width: number; height: number };

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

async function drawVisual(output: PDFPage, sourcePage: PDFPage, pageNumber: number, target: VisualBox, label?: string, labelFont?: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
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

  const panelPadding = label ? 4 : 0;
  const labelHeight = label ? 16 : 0;
  const zone = {
    x: target.x + panelPadding,
    y: target.y + panelPadding,
    width: target.width - panelPadding * 2,
    height: target.height - panelPadding * 2 - labelHeight,
  };
  if (label) {
    output.drawRectangle({
      x: target.x, y: target.y, width: target.width, height: target.height,
      borderColor: rgb(0.78, 0.82, 0.9), borderWidth: 0.6, color: rgb(1, 1, 1),
    });
    output.drawText(label, {
      x: target.x + 6, y: target.y + target.height - 12, size: 7.5,
      font: labelFont, color: rgb(0.1, 0.18, 0.35),
    });
  }
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
  layout: BatVisualLayout = "one_per_page",
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

  const outputPageCount = layout === "recto_verso" ? Math.ceil(selections.length / 4) : selections.length;
  // Copy while the template page still contains only the shared fields.
  const copies = outputPageCount > 1
    ? await document.copyPages(document, Array.from({ length: outputPageCount - 1 }, () => 0))
    : [];
  const outputPages = [document.getPage(0), ...copies.map((copy) => document.addPage(copy))];
  for (const [pageIndex, output] of outputPages.entries()) {
    const contents = output.node.Contents();
    // Copied pages may share the same stream array. Each page needs its own visual.
    if (contents instanceof PDFArray) output.node.set(PDFName.Contents, contents.clone(document.context));
    const pageSelections = layout === "recto_verso"
      ? selections.slice(pageIndex * 4, pageIndex * 4 + 4)
      : [selections[pageIndex]];
    if (layout === "one_per_page") {
      const selection = pageSelections[0];
      await drawVisual(output, sources[selection.sourceIndex].getPage(selection.page - 1), selection.page, batVisualZone);
      continue;
    }

    const labelFont = await document.embedFont(StandardFonts.HelveticaBold);
    const gap = 8;
    const pairCount = Math.ceil(pageSelections.length / 2);
    const rowHeight = (batVisualZone.height - gap * (pairCount - 1)) / pairCount;
    const columnWidth = (batVisualZone.width - gap) / 2;
    for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
      const pair = pageSelections.slice(pairIndex * 2, pairIndex * 2 + 2);
      const y = batVisualZone.y + batVisualZone.height - (pairIndex + 1) * rowHeight - pairIndex * gap;
      for (let side = 0; side < 2; side += 1) {
        const selection = pair[side];
        const box = { x: batVisualZone.x + side * (columnWidth + gap), y, width: columnWidth, height: rowHeight };
        const label = `MODÈLE ${pageIndex * 2 + pairIndex + 1} · ${side === 0 ? "RECTO" : "VERSO"}`;
        if (selection) {
          await drawVisual(output, sources[selection.sourceIndex].getPage(selection.page - 1), selection.page, box, label, labelFont);
        } else {
          output.drawRectangle({ x: box.x, y: box.y, width: box.width, height: box.height, borderColor: rgb(0.86, 0.88, 0.93), borderWidth: 0.6, color: rgb(0.98, 0.98, 0.99) });
          output.drawText(label, { x: box.x + 6, y: box.y + box.height - 12, size: 7.5, font: labelFont, color: rgb(0.45, 0.48, 0.55) });
        }
      }
    }
  }

  return document.save({ useObjectStreams: false });
}
