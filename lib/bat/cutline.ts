import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFOperator,
  PDFOperatorNames,
  type PDFPage,
} from "pdf-lib";
import { mmToPoints, pointsToMm } from "./preflight.ts";

export type CutlineMode = "trim" | "custom";
export type CutlinePages = "all" | number;

export type CutlineOptions = {
  mode: CutlineMode;
  widthMm?: number;
  heightMm?: number;
  spotName: string;
  lineWidthPt: number;
  pages: CutlinePages;
};

export type CutlinePlacement = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  source: CutlineMode;
  trimExplicit: boolean;
};

export type CutlineResult = {
  bytes: Uint8Array;
  pageCount: number;
  placements: CutlinePlacement[];
  spotName: string;
  warning: string;
};

function cleanSpotName(value: string) {
  const name = value.trim();
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(name)) throw new Error("Le nom du ton direct doit contenir 1 à 64 caractères : lettres, chiffres, point, tiret ou underscore.");
  return name;
}

function positive(value: number | undefined, label: string) {
  if (!Number.isFinite(value) || !value || value <= 0 || value > 1000) throw new Error(`${label} doit être compris entre 0,1 et 1 000 mm.`);
  return value;
}

function explicitTrim(page: PDFPage) {
  return Boolean(page.node.get(PDFName.of("TrimBox")));
}

function placement(page: PDFPage, options: CutlineOptions, pageNumber: number): CutlinePlacement {
  const trim = page.getTrimBox();
  const trimIsExplicit = explicitTrim(page);
  const widthMm = options.mode === "trim" ? pointsToMm(trim.width) : positive(options.widthMm, "La largeur");
  const heightMm = options.mode === "trim" ? pointsToMm(trim.height) : positive(options.heightMm, "La hauteur");
  if (options.mode === "custom" && (widthMm > pointsToMm(trim.width) + 0.01 || heightMm > pointsToMm(trim.height) + 0.01)) {
    throw new Error(`Le tracé ${widthMm} × ${heightMm} mm dépasse la zone de rognage de la page ${pageNumber}.`);
  }
  const width = mmToPoints(widthMm);
  const height = mmToPoints(heightMm);
  return {
    page: pageNumber,
    x: trim.x + (trim.width - width) / 2,
    y: trim.y + (trim.height - height) / 2,
    width,
    height,
    source: options.mode,
    trimExplicit: trimIsExplicit,
  };
}

function createSpotColorSpace(document: PDFDocument, spotName: string) {
  const context = document.context;
  const tintTransform = context.register(context.obj({
    FunctionType: 2,
    Domain: [0, 1],
    C0: [0, 0, 0, 0],
    C1: [0, 1, 0, 0],
    N: 1,
  }));
  const separation = PDFArray.withContext(context);
  separation.push(PDFName.of("Separation"));
  separation.push(PDFName.of(spotName));
  separation.push(PDFName.of("DeviceCMYK"));
  separation.push(tintTransform);
  return context.register(separation);
}

function installSpotResource(document: PDFDocument, page: PDFPage, spotName: string) {
  const resources = page.node.normalizedEntries().Resources;
  const colorSpaces = resources.lookupMaybe(PDFName.of("ColorSpace"), PDFDict) ?? PDFDict.withContext(document.context);
  const colorSpaceKey = PDFName.of("CSCutContour");
  colorSpaces.set(colorSpaceKey, createSpotColorSpace(document, spotName));
  resources.set(PDFName.of("ColorSpace"), colorSpaces);

  const graphicsState = document.context.register(document.context.obj({ Type: "ExtGState", OP: true, op: true, OPM: 1 }));
  const graphicsStateKey = page.node.newExtGState("CutContour", graphicsState);
  return { colorSpaceKey, graphicsStateKey };
}

function drawCutline(page: PDFPage, placementData: CutlinePlacement, lineWidthPt: number, colorSpaceKey: PDFName, graphicsStateKey: PDFName) {
  page.pushOperators(
    PDFOperator.of(PDFOperatorNames.PushGraphicsState),
    PDFOperator.of(PDFOperatorNames.StrokingColorspace, [colorSpaceKey]),
    PDFOperator.of(PDFOperatorNames.StrokingColorN, [PDFNumber.of(1)]),
    PDFOperator.of(PDFOperatorNames.SetGraphicsStateParams, [graphicsStateKey]),
    PDFOperator.of(PDFOperatorNames.SetLineWidth, [PDFNumber.of(lineWidthPt)]),
    PDFOperator.of(PDFOperatorNames.AppendRectangle, [PDFNumber.of(placementData.x), PDFNumber.of(placementData.y), PDFNumber.of(placementData.width), PDFNumber.of(placementData.height)]),
    PDFOperator.of(PDFOperatorNames.StrokePath),
    PDFOperator.of(PDFOperatorNames.PopGraphicsState),
  );
}

export async function addCutlineToPdf(bytes: Uint8Array, options: CutlineOptions): Promise<CutlineResult> {
  const spotName = cleanSpotName(options.spotName);
  if (!Number.isFinite(options.lineWidthPt) || options.lineWidthPt <= 0 || options.lineWidthPt > 20) throw new Error("L’épaisseur du tracé doit être comprise entre 0,01 et 20 pt.");
  if (options.mode === "custom") { positive(options.widthMm, "La largeur"); positive(options.heightMm, "La hauteur"); }
  const document = await PDFDocument.load(bytes, { updateMetadata: false });
  const pageCount = document.getPageCount();
  if (pageCount < 1) throw new Error("Le PDF ne contient aucune page.");
  const indexes = options.pages === "all" ? Array.from({ length: pageCount }, (_, index) => index) : [options.pages - 1];
  if (indexes.some((index) => index < 0 || index >= pageCount)) throw new Error("Le numéro de page demandé n’existe pas.");
  const placements: CutlinePlacement[] = [];
  for (const index of indexes) {
    const page = document.getPage(index);
    const placementData = placement(page, options, index + 1);
    const resources = installSpotResource(document, page, spotName);
    drawCutline(page, placementData, options.lineWidthPt, resources.colorSpaceKey, resources.graphicsStateKey);
    placements.push(placementData);
  }
  document.setTitle(`Tracé de découpe · ${spotName}`);
  document.setAuthor("Agents");
  const trimWarning = placements.some((item) => !item.trimExplicit) ? " Certaines pages utilisent une zone de rognage héritée, à confirmer avant production." : "";
  return {
    bytes: await document.save({ useObjectStreams: false }),
    pageCount: placements.length,
    placements,
    spotName,
    warning: `Tracé vectoriel en ton direct ${spotName}, surimpression activée. Vérifiez le nom attendu par votre RIP.${trimWarning}`,
  };
}

export async function inspectCutlineSpot(bytes: Uint8Array, pageNumber = 1) {
  const document = await PDFDocument.load(bytes, { updateMetadata: false });
  const page = document.getPage(pageNumber - 1);
  const colorspaces = page.node.normalizedEntries().Resources.lookupMaybe(PDFName.of("ColorSpace"), PDFDict);
  if (!colorspaces) return { found: false, name: null, key: null };
  for (const key of colorspaces.keys()) {
    const colorSpace = colorspaces.lookupMaybe(key, PDFArray);
    if (!colorSpace || colorSpace.size() < 2) continue;
    const kind = colorSpace.lookupMaybe(0, PDFName)?.asString().replace(/^\/+/, "");
    const name = colorSpace.lookupMaybe(1, PDFName)?.asString().replace(/^\/+/, "");
    if (kind === "Separation" && name) return { found: true, name, key: key.asString().replace(/^\/+/, "") };
  }
  return { found: false, name: null, key: null };
}
