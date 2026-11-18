import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { preflightPdf, preflightProfiles } from "../lib/bat/preflight.ts";
import { calculateBleedOutput } from "../lib/bat/bleed.ts";
import { generatePreflightReportPdf } from "../lib/bat/report.ts";
import { imposePdf } from "../lib/bat/imposition.ts";

test("le calcul de fond perdu conserve le format fini et ajoute deux marges", () => {
  const output = calculateBleedOutput(841.89, 595.276, 3);
  assert.equal(Math.round(output.trimWidthPt), 842);
  assert.equal(Math.round(output.trimHeightPt), 595);
  assert.equal(Math.round(output.outputWidthPt), 859);
  assert.equal(Math.round(output.outputHeightPt), 612);
});

test("le préflight mesure un A4 paysage avec 3 mm de fond perdu", async () => {
  const document = await PDFDocument.create();
  const trimWidth = 841.89;
  const trimHeight = 595.276;
  const bleed = 72 / 25.4 * 3;
  const page = document.addPage([trimWidth + bleed * 2, trimHeight + bleed * 2]);
  page.setTrimBox(bleed, bleed, trimWidth, trimHeight);
  page.setBleedBox(0, 0, trimWidth + bleed * 2, trimHeight + bleed * 2);
  page.drawText("Contrôle prépresse");

  const report = await preflightPdf(new Uint8Array(await document.save()), preflightProfiles.a4Landscape);
  assert.equal(report.status, "pass", "les contrôles mesurables passent ; les limites non certifiables restent séparées");
  assert.equal(report.file.pages, 1);
  assert.equal(report.pages[0].explicitBoxes.trim, true);
  assert.equal(report.pages[0].explicitBoxes.bleed, true);
  assert.equal(report.issues.some((issue) => issue.code === "BLEED_OK"), true);
  assert.equal(report.issues.some((issue) => issue.code === "TRIM_SIZE_OK"), true);
  assert.equal(report.issues.some((issue) => issue.code === "BLEED_TOO_SMALL"), false);
  assert.equal(report.summary.unsupported, 1);
});

test("le préflight refuse une signature non PDF sans parser le contenu", async () => {
  const report = await preflightPdf(new TextEncoder().encode("not-a-pdf"));
  assert.equal(report.status, "fail");
  assert.equal(report.issues[0].code, "PDF_SIGNATURE_INVALID");
});

test("le préflight signale un fond perdu insuffisant sans le fabriquer", async () => {
  const document = await PDFDocument.create();
  const page = document.addPage([841.89, 595.276]);
  page.setTrimBox(0, 0, 841.89, 595.276);
  page.setBleedBox(0, 0, 841.89, 595.276);
  const report = await preflightPdf(new Uint8Array(await document.save()), preflightProfiles.a4Landscape);
  assert.equal(report.status, "fail");
  assert.equal(report.issues.some((issue) => issue.code === "BLEED_TOO_SMALL"), true);
});

test("le préflight inventorie les images et ne prétend pas connaître leur DPI effectif", async () => {
  const document = await PDFDocument.create();
  const page = document.addPage([600, 400]);
  const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
  const image = await document.embedPng(png);
  page.drawImage(image, { x: 0, y: 0, width: 300, height: 300 });

  const report = await preflightPdf(new Uint8Array(await document.save()), preflightProfiles.digitalPrint);
  assert.equal(report.pages[0].resources.images, 1);
  assert.equal(report.pages[0].resources.imageAssets[0].width, 1);
  assert.equal(report.pages[0].resources.imageAssets[0].height, 1);
  assert.equal(report.issues.some((issue) => issue.code === "IMAGE_DPI_UNVERIFIED"), true);
});

test("le rapport de préflight produit un PDF réouvrable", async () => {
  const document = await PDFDocument.create();
  document.addPage([595.28, 841.89]);
  const report = await preflightPdf(new Uint8Array(await document.save()), preflightProfiles.generic);
  const bytes = await generatePreflightReportPdf(report, "source.pdf");
  const reopened = await PDFDocument.load(bytes);
  assert.ok(reopened.getPageCount() >= 1);
  assert.equal(reopened.getTitle(), "Rapport de préflight · source.pdf");
});

test("l’imposition N-up simple produit une feuille vectorielle", async () => {
  const document = await PDFDocument.create();
  const page = document.addPage([200, 300]);
  page.drawText("Agents", { x: 20, y: 250 });
  const result = await imposePdf(new Uint8Array(await document.save()), {
    sheetWidthMm: 210, sheetHeightMm: 297, columns: 2, rows: 2, gutterMm: 5, marginMm: 5, mode: "step_repeat", sourcePage: 1,
  });
  const reopened = await PDFDocument.load(result.bytes);
  assert.equal(reopened.getPageCount(), 1);
  assert.equal(result.placedPages, 4);
});
