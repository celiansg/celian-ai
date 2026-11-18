import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { PreflightIssue, PreflightReport } from "./preflight";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function clean(value: string, max = 220) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function wrap(text: string, font: PDFFont, size: number, width = CONTENT_WIDTH) {
  const words = clean(text).split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrapped(page: PDFPage, text: string, font: PDFFont, size: number, y: number, color = rgb(0.12, 0.16, 0.25), width = CONTENT_WIDTH) {
  let nextY = y;
  for (const line of wrap(text, font, size, width)) {
    page.drawText(line, { x: MARGIN, y: nextY, size, font, color });
    nextY -= size + 4;
  }
  return nextY;
}

function severityColor(issue: PreflightIssue) {
  if (issue.severity === "error") return rgb(0.72, 0.12, 0.1);
  if (issue.severity === "warning") return rgb(0.58, 0.35, 0.02);
  if (issue.severity === "unsupported") return rgb(0.32, 0.37, 0.47);
  return rgb(0.08, 0.32, 0.65);
}

function drawHeader(page: PDFPage, titleFont: PDFFont, bodyFont: PDFFont, fileName: string, pageNumber: number) {
  page.drawText("Agents · Rapport de préflight", { x: MARGIN, y: PAGE_HEIGHT - MARGIN, size: 9, font: bodyFont, color: rgb(0.32, 0.38, 0.5) });
  page.drawText(clean(fileName, 100), { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 18, size: 9, font: bodyFont, color: rgb(0.32, 0.38, 0.5) });
  page.drawText(String(pageNumber), { x: PAGE_WIDTH - MARGIN - 12, y: PAGE_HEIGHT - MARGIN, size: 9, font: bodyFont, color: rgb(0.32, 0.38, 0.5) });
  page.drawLine({ start: { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 28 }, end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - MARGIN - 28 }, thickness: 0.6, color: rgb(0.84, 0.87, 0.92) });
  return PAGE_HEIGHT - MARGIN - 52;
}

export async function generatePreflightReportPdf(report: PreflightReport, fileName: string) {
  const document = await PDFDocument.create();
  const titleFont = await document.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await document.embedFont(StandardFonts.Helvetica);
  const pages: PDFPage[] = [];
  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  let pageNumber = 1;
  let y = drawHeader(page, titleFont, bodyFont, fileName, pageNumber);

  const nextPage = () => {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    pageNumber += 1;
    y = drawHeader(page, titleFont, bodyFont, fileName, pageNumber);
  };
  const ensure = (height: number) => { if (y - height < MARGIN + 18) nextPage(); };
  const line = (text: string, size = 10, color = rgb(0.12, 0.16, 0.25), font = bodyFont) => {
    ensure(size + 7);
    y = drawWrapped(page, text, font, size, y, color);
    y -= 3;
  };

  page.drawText("Rapport de préflight PDF", { x: MARGIN, y, size: 22, font: titleFont, color: rgb(0.07, 0.1, 0.2) });
  y -= 30;
  line(`${report.status === "pass" ? "Conforme sur les contrôles disponibles" : report.status === "warning" ? "À vérifier avant production" : "Non conforme sur un ou plusieurs contrôles"}`, 12, severityColor({ severity: report.status === "pass" ? "info" : report.status === "warning" ? "warning" : "error" } as PreflightIssue), titleFont);
  y -= 5;
  line(`Fichier : ${fileName}`);
  line(`Profil : ${report.profile.label}`);
  line(`Taille : ${report.file.bytes} octets · Pages : ${report.file.pages} · Chiffré : ${report.file.encrypted ? "oui" : "non"}`);
  y -= 7;
  page.drawRectangle({ x: MARGIN, y: y - 42, width: CONTENT_WIDTH, height: 50, color: rgb(0.96, 0.97, 0.99), borderColor: rgb(0.84, 0.87, 0.92), borderWidth: 0.6 });
  page.drawText(`Infos ${report.summary.info}`, { x: MARGIN + 12, y: y - 16, size: 10, font: bodyFont, color: rgb(0.08, 0.32, 0.65) });
  page.drawText(`Avertissements ${report.summary.warning}`, { x: MARGIN + 115, y: y - 16, size: 10, font: bodyFont, color: rgb(0.58, 0.35, 0.02) });
  page.drawText(`Erreurs ${report.summary.error}`, { x: MARGIN + 285, y: y - 16, size: 10, font: bodyFont, color: rgb(0.72, 0.12, 0.1) });
  page.drawText(`Limites ${report.summary.unsupported}`, { x: MARGIN + 390, y: y - 16, size: 10, font: bodyFont, color: rgb(0.32, 0.37, 0.47) });
  y -= 70;
  line("Ce rapport décrit les contrôles effectués par Agents. Il ne remplace pas une certification PDF/X, ICC ou RIP de production.", 9, rgb(0.32, 0.38, 0.5));

  ensure(34);
  page.drawText("Mesures par page", { x: MARGIN, y, size: 14, font: titleFont, color: rgb(0.07, 0.1, 0.2) });
  y -= 21;
  for (const item of report.pages) {
    ensure(48);
    line(`Page ${item.page} · Trim ${Math.round(item.trimBox.width / (72 / 25.4))}×${Math.round(item.trimBox.height / (72 / 25.4))} mm · rotation ${item.rotation}°`, 10, rgb(0.12, 0.16, 0.25), titleFont);
    line(`Boxes : ${item.explicitBoxes.trim ? "Trim" : "Trim héritée"}, ${item.explicitBoxes.bleed ? "Bleed" : "Bleed absente"} · Images : ${item.resources.images} · Polices incorporées : ${item.resources.embeddedFonts} · non incorporées : ${item.resources.unembeddedFonts}`, 9, rgb(0.32, 0.38, 0.5));
  }

  ensure(34);
  page.drawText("Constats et limites", { x: MARGIN, y, size: 14, font: titleFont, color: rgb(0.07, 0.1, 0.2) });
  y -= 22;
  for (const issue of report.issues) {
    const message = `${issue.page ? `Page ${issue.page} · ` : ""}${issue.message}`;
    const proof = `${issue.code} · ${issue.proof}`;
    const height = (wrap(message, bodyFont, 9).length + wrap(proof, bodyFont, 8).length) * 13 + 11;
    ensure(height);
    page.drawRectangle({ x: MARGIN, y: y - height + 5, width: CONTENT_WIDTH, height, color: rgb(0.985, 0.987, 0.992), borderColor: rgb(0.88, 0.89, 0.93), borderWidth: 0.4 });
    let issueY = y - 12;
    for (const wrapped of wrap(message, bodyFont, 9, CONTENT_WIDTH - 20)) { page.drawText(wrapped, { x: MARGIN + 8, y: issueY, size: 9, font: bodyFont, color: severityColor(issue) }); issueY -= 12; }
    for (const wrapped of wrap(proof, bodyFont, 8, CONTENT_WIDTH - 20)) { page.drawText(wrapped, { x: MARGIN + 8, y: issueY, size: 8, font: bodyFont, color: rgb(0.32, 0.38, 0.5) }); issueY -= 11; }
    y -= height + 7;
  }

  document.setTitle(`Rapport de préflight · ${clean(fileName, 80)}`);
  document.setAuthor("Agents");
  document.setSubject("Contrôle de production PDF");
  return document.save({ useObjectStreams: false });
}
