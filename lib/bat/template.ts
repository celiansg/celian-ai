import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { PDFDict, PDFDocument, PDFName, StandardFonts, rgb } from "pdf-lib";
import mapping from "../../knowledge/templates/BAT-template.mapping.v1.json";
import { batFields, type BatDraftInput } from "./fields";

export const BAT_TEMPLATE_PATH = path.join(process.cwd(), "knowledge", "templates", "BAT template(1).pdf");
export const BAT_TEMPLATE_PROFILE_PATH = path.join(process.cwd(), "knowledge", "templates", "BAT-template.profile.json");

export class BatFieldError extends Error {}

export function getBatTemplateStatus() {
  return {
    available: existsSync(BAT_TEMPLATE_PATH),
    path: "knowledge/templates/BAT template(1).pdf",
    format: "A4 landscape",
    standard: "PDF/X-4",
    pages: 1,
    outputStatus: "draft-unvalidated" as const,
  };
}

function wrapLine(value: string, fits: (text: string) => boolean) {
  const lines: string[] = [];
  let current = "";
  for (const word of value.split(/\s+/).filter(Boolean)) {
    if (!fits(word)) throw new BatFieldError("Un mot des remarques dépasse la largeur disponible.");
    const candidate = current ? `${current} ${word}` : word;
    if (!fits(candidate)) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  return [...lines, current];
}

export async function generateBatDraft(input: BatDraftInput) {
  if (!existsSync(BAT_TEMPLATE_PATH)) throw new Error("Le template BAT officiel est introuvable.");
  const source = await readFile(BAT_TEMPLATE_PATH);
  const document = await PDFDocument.load(source);
  if (document.getPageCount() !== 1) throw new Error("Le template BAT attendu doit contenir exactement une page.");
  const page = document.getPage(0);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const valueOptions = { size: 8.5, color: rgb(0.07, 0.1, 0.18), font };
  function measure(value: string, label: string) {
    try {
      return font.widthOfTextAtSize(value, valueOptions.size);
    } catch {
      throw new BatFieldError(`Le champ « ${label} » contient un caractère incompatible avec la police du modèle.`);
    }
  }

  for (const [fieldName, label] of batFields) {
    if (fieldName === "remarks") continue;
    const value = input[fieldName]?.trim();
    if (!value) continue;
    const field = mapping.fields[fieldName];
    if (/[\r\n\t]/.test(value)) throw new BatFieldError(`Le champ « ${label} » doit tenir sur une ligne.`);
    const width = measure(value, label);
    const size = width > field.maxWidth ? valueOptions.size * field.maxWidth / width : valueOptions.size;
    if (size < 7) throw new BatFieldError(`Le champ « ${label} » est trop long pour le modèle.`);
    page.drawText(value, { ...valueOptions, size, x: field.x, y: field.y });
  }

  const remarksField = mapping.fields.remarks;
  const remarks = input.remarks?.trim().split(/\r?\n/).flatMap((line) =>
    wrapLine(line, (text) => measure(text, "Remarques") <= remarksField.maxWidth)
  ) ?? [];
  if (remarks.length > remarksField.maxLines) throw new BatFieldError("Les remarques dépassent les cinq lignes disponibles.");
  remarks.forEach((line, index) => {
    if (line) page.drawText(line, { ...valueOptions, x: remarksField.x, y: remarksField.y - index * remarksField.lineHeight });
  });

  // The source's PDF/X declaration does not apply to the modified draft.
  document.catalog.delete(PDFName.of("Metadata"));
  const info = document.context.lookupMaybe(document.context.trailerInfo.Info, PDFDict);
  info?.delete(PDFName.of("GTS_PDFXVersion"));
  info?.delete(PDFName.of("GTS_PDFXConformance"));
  document.setTitle("BAT — Brouillon à relire");
  // Le fichier source conserve ses éléments graphiques ; le texte est ajouté sur une copie.
  return document.save({ useObjectStreams: false });
}
