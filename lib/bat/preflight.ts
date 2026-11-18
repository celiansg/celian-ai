import { PDFArray, PDFDict, PDFDocument, PDFName } from "pdf-lib";

export type PreflightSeverity = "info" | "warning" | "error" | "unsupported";

export type PreflightIssue = {
  code: string;
  severity: PreflightSeverity;
  page?: number;
  message: string;
  proof: string;
  method: string;
};

export type PdfBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PreflightProfile = {
  id: string;
  label: string;
  expectedTrim?: { widthMm: number; heightMm: number; toleranceMm: number };
  requiredBleedMm: number;
  maxPages: number;
};

export type PreflightPage = {
  page: number;
  rotation: number;
  mediaBox: PdfBox;
  cropBox: PdfBox;
  trimBox: PdfBox;
  bleedBox: PdfBox;
  explicitBoxes: { trim: boolean; bleed: boolean; art: boolean };
  resources: { fonts: number; xObjects: number; graphicStates: number };
  annotations: number;
  hasContent: boolean;
};

export type PreflightReport = {
  version: "1";
  status: "pass" | "warning" | "fail";
  profile: PreflightProfile;
  file: { bytes: number; pages: number; encrypted: boolean };
  pages: PreflightPage[];
  issues: PreflightIssue[];
  summary: { info: number; warning: number; error: number; unsupported: number };
};

export const preflightProfiles: Record<string, PreflightProfile> = {
  generic: {
    id: "generic",
    label: "Contrôle général PDF",
    requiredBleedMm: 0,
    maxPages: 50,
  },
  a4Landscape: {
    id: "a4-landscape",
    label: "Impression A4 paysage · fond perdu 3 mm",
    expectedTrim: { widthMm: 297, heightMm: 210, toleranceMm: 0.5 },
    requiredBleedMm: 3,
    maxPages: 50,
  },
  a4Portrait: {
    id: "a4-portrait",
    label: "Impression A4 portrait · fond perdu 3 mm",
    expectedTrim: { widthMm: 210, heightMm: 297, toleranceMm: 0.5 },
    requiredBleedMm: 3,
    maxPages: 50,
  },
};

export const preflightLimits = {
  maxBytes: 25 * 1024 * 1024,
  maxPages: 50,
};

const POINTS_PER_MM = 72 / 25.4;

export function mmToPoints(value: number) {
  return value * POINTS_PER_MM;
}

export function pointsToMm(value: number) {
  return value / POINTS_PER_MM;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function box(value: { x: number; y: number; width: number; height: number }): PdfBox {
  return { x: round(value.x), y: round(value.y), width: round(value.width), height: round(value.height) };
}

function hasDirectBox(page: ReturnType<PDFDocument["getPage"]>, name: "TrimBox" | "BleedBox" | "ArtBox") {
  return Boolean(page.node.get(PDFName.of(name)));
}

function countArray(value: PDFArray | undefined) {
  return value?.size() ?? 0;
}

function countDict(value: PDFDict | undefined) {
  return value?.keys().length ?? 0;
}

function pushBoxIssues(issues: PreflightIssue[], pageNumber: number, name: string, current: PdfBox, media: PdfBox) {
  if (![current.x, current.y, current.width, current.height].every(Number.isFinite) || current.width <= 0 || current.height <= 0) {
    issues.push({
      code: `${name.toUpperCase()}_INVALID`, severity: "error", page: pageNumber,
      message: `${name} invalide.`, proof: JSON.stringify(current), method: "Lecture de la box PDF et contrôle de dimensions positives.",
    });
    return;
  }
  const inside = current.x >= media.x && current.y >= media.y
    && current.x + current.width <= media.x + media.width
    && current.y + current.height <= media.y + media.height;
  if (!inside) {
    issues.push({
      code: `${name.toUpperCase()}_OUTSIDE_MEDIA`, severity: "error", page: pageNumber,
      message: `${name} sort de la MediaBox.`, proof: `${JSON.stringify(current)} hors ${JSON.stringify(media)}`,
      method: "Comparaison géométrique des limites PDF.",
    });
  }
}

function bleedMargins(trim: PdfBox, bleed: PdfBox) {
  return {
    left: Math.max(0, trim.x - bleed.x),
    bottom: Math.max(0, trim.y - bleed.y),
    right: Math.max(0, bleed.x + bleed.width - trim.x - trim.width),
    top: Math.max(0, bleed.y + bleed.height - trim.y - trim.height),
  };
}

function addBleedIssue(issues: PreflightIssue[], pageNumber: number, trim: PdfBox, bleed: PdfBox, requiredMm: number, explicit: boolean) {
  if (requiredMm <= 0) return;
  const margins = bleedMargins(trim, bleed);
  const minimumMm = pointsToMm(Math.min(margins.left, margins.bottom, margins.right, margins.top));
  if (minimumMm + 0.01 < requiredMm) {
    issues.push({
      code: explicit ? "BLEED_TOO_SMALL" : "BLEED_BOX_MISSING",
      severity: explicit ? "error" : "warning",
      page: pageNumber,
      message: explicit ? `Fond perdu insuffisant : ${round(minimumMm)} mm mesuré, ${requiredMm} mm demandé.` : `BleedBox explicite absent : ${round(minimumMm)} mm seulement mesurable depuis la zone visible.`,
      proof: `marges=${JSON.stringify(Object.fromEntries(Object.entries(margins).map(([key, value]) => [key, `${round(pointsToMm(value))} mm`])))}; trim=${JSON.stringify(trim)}; bleed=${JSON.stringify(bleed)}`,
      method: "Mesure des quatre marges entre TrimBox et BleedBox; aucune extension automatique n’est effectuée.",
    });
  } else {
    issues.push({
      code: "BLEED_OK", severity: "info", page: pageNumber,
      message: `Fond perdu conforme : ${round(minimumMm)} mm minimum mesuré.`,
      proof: JSON.stringify(Object.fromEntries(Object.entries(margins).map(([key, value]) => [key, `${round(pointsToMm(value))} mm`]))),
      method: "Mesure des quatre marges entre TrimBox et BleedBox.",
    });
  }
}

export async function preflightPdf(bytes: Uint8Array, profile: PreflightProfile = preflightProfiles.generic): Promise<PreflightReport> {
  const issues: PreflightIssue[] = [];
  if (bytes.byteLength < 5 || new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    return {
      version: "1", status: "fail", profile, file: { bytes: bytes.byteLength, pages: 0, encrypted: false }, pages: [],
      issues: [{ code: "PDF_SIGNATURE_INVALID", severity: "error", message: "La signature PDF est absente ou invalide.", proof: "Les cinq premiers octets ne sont pas %PDF-.", method: "Lecture de la signature binaire sans exécuter le contenu." }],
      summary: { info: 0, warning: 0, error: 1, unsupported: 0 },
    };
  }
  if (bytes.byteLength > preflightLimits.maxBytes) {
    return {
      version: "1", status: "fail", profile, file: { bytes: bytes.byteLength, pages: 0, encrypted: false }, pages: [],
      issues: [{ code: "FILE_TOO_LARGE", severity: "error", message: "Le fichier dépasse la limite de 25 Mo.", proof: `${bytes.byteLength} octets`, method: "Contrôle de taille avant parsing." }],
      summary: { info: 0, warning: 0, error: 1, unsupported: 0 },
    };
  }

  let document: PDFDocument;
  try {
    document = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "erreur de parsing inconnue";
    return {
      version: "1", status: "fail", profile, file: { bytes: bytes.byteLength, pages: 0, encrypted: false }, pages: [],
      issues: [{ code: "PDF_PARSE_FAILED", severity: "error", message: "Le PDF ne peut pas être ouvert par le moteur de contrôle.", proof: message.slice(0, 240), method: "Ouverture contrôlée avec pdf-lib; les fichiers chiffrés ou corrompus sont refusés." }],
      summary: { info: 0, warning: 0, error: 1, unsupported: 0 },
    };
  }

  const pageCount = document.getPageCount();
  const encrypted = document.isEncrypted;
  if (encrypted) issues.push({ code: "PDF_ENCRYPTED", severity: "error", message: "Le PDF est chiffré et ne peut pas être contrôlé de manière fiable.", proof: "PDFDocument.isEncrypted=true", method: "Lecture de l’état de chiffrement du document." });
  if (pageCount < 1) issues.push({ code: "PAGE_COUNT_EMPTY", severity: "error", message: "Le PDF ne contient aucune page.", proof: "pageCount=0", method: "Lecture du nombre de pages." });
  if (pageCount > Math.min(profile.maxPages, preflightLimits.maxPages)) issues.push({ code: "PAGE_COUNT_TOO_HIGH", severity: "error", message: `Le PDF dépasse la limite de ${Math.min(profile.maxPages, preflightLimits.maxPages)} pages.`, proof: `pageCount=${pageCount}`, method: "Limite de sécurité avant analyse page par page." });

  const pages: PreflightPage[] = [];
  for (let index = 0; index < Math.min(pageCount, preflightLimits.maxPages); index += 1) {
    const page = document.getPage(index);
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    const mediaBox = box(page.getMediaBox());
    const cropBox = box(page.getCropBox());
    const trimBox = box(page.getTrimBox());
    const bleedBox = box(page.getBleedBox());
    const normalized = page.node.normalizedEntries();
    const pageReport: PreflightPage = {
      page: index + 1, rotation, mediaBox, cropBox, trimBox, bleedBox,
      explicitBoxes: { trim: hasDirectBox(page, "TrimBox"), bleed: hasDirectBox(page, "BleedBox"), art: hasDirectBox(page, "ArtBox") },
      resources: { fonts: countDict(normalized.Font), xObjects: countDict(normalized.XObject), graphicStates: countDict(normalized.ExtGState) },
      annotations: countArray(page.node.Annots()), hasContent: Boolean(page.node.Contents()),
    };
    pages.push(pageReport);

    pushBoxIssues(issues, index + 1, "MediaBox", mediaBox, mediaBox);
    pushBoxIssues(issues, index + 1, "CropBox", cropBox, mediaBox);
    pushBoxIssues(issues, index + 1, "TrimBox", trimBox, mediaBox);
    pushBoxIssues(issues, index + 1, "BleedBox", bleedBox, mediaBox);
    if (!pageReport.explicitBoxes.trim) issues.push({ code: "TRIM_BOX_MISSING", severity: "warning", page: index + 1, message: "TrimBox explicite absente; la TrimBox utilisée est une valeur héritée ou de repli.", proof: JSON.stringify(trimBox), method: "La valeur effective de pdf-lib est conservée, mais son origine n’est pas garantie." });
    addBleedIssue(issues, index + 1, trimBox, bleedBox, profile.requiredBleedMm, pageReport.explicitBoxes.bleed);
    if (![0, 90, 180, 270].includes(rotation)) issues.push({ code: "ROTATION_UNSUPPORTED", severity: "error", page: index + 1, message: "La rotation de page n’est pas supportée pour ce contrôle.", proof: `rotation=${rotation}°`, method: "Contrôle des rotations PDF autorisées par le profil." });
    if (!pageReport.hasContent) issues.push({ code: "PAGE_WITHOUT_CONTENT", severity: "warning", page: index + 1, message: "La page ne contient pas de flux graphique détectable.", proof: "Contents absent", method: "Lecture du flux Contents de la page." });
    if (pageReport.annotations > 0) issues.push({ code: "ANNOTATIONS_PRESENT", severity: "warning", page: index + 1, message: `${pageReport.annotations} annotation(s) présente(s) : vérifiez qu’elles ne sont pas destinées à l’impression.`, proof: `annotations=${pageReport.annotations}`, method: "Comptage de la collection Annots; le contenu des annotations n’est pas interprété." });
  }

  const actualFormFields = (() => { try { return document.getForm().getFields().length; } catch { return 0; } })();
  if (actualFormFields > 0) issues.push({ code: "ACROFORM_PRESENT", severity: "warning", message: `${actualFormFields} champ(s) de formulaire détecté(s).`, proof: `fields=${actualFormFields}`, method: "Lecture AcroForm via pdf-lib; les scripts et actions ne sont pas exécutés." });
  issues.push({ code: "PDF_STANDARD_UNVERIFIED", severity: "unsupported", message: "La conformité PDF/X, les profils ICC, les polices incorporées et les DPI image ne sont pas certifiés par ce contrôle.", proof: "Le moteur ne remplace pas un préflight callas/Adobe/Ghent.", method: "Limite explicite : les ressources sont comptées, mais leur sémantique colorimétrique et leur résolution ne sont pas déduites." });

  if (profile.expectedTrim) {
    const expectedWidth = mmToPoints(profile.expectedTrim.widthMm);
    const expectedHeight = mmToPoints(profile.expectedTrim.heightMm);
    const tolerance = mmToPoints(profile.expectedTrim.toleranceMm);
    for (const page of pages) {
      const rotated = page.rotation === 90 || page.rotation === 270;
      const width = rotated ? page.trimBox.height : page.trimBox.width;
      const height = rotated ? page.trimBox.width : page.trimBox.height;
      if (Math.abs(width - expectedWidth) > tolerance || Math.abs(height - expectedHeight) > tolerance) {
        issues.push({ code: "TRIM_SIZE_MISMATCH", severity: "error", page: page.page, message: `Format fini différent du profil ${profile.label}.`, proof: `mesuré=${round(pointsToMm(width))}×${round(pointsToMm(height))} mm; attendu=${profile.expectedTrim.widthMm}×${profile.expectedTrim.heightMm} mm`, method: "Comparaison TrimBox après prise en compte de la rotation." });
      } else {
        issues.push({ code: "TRIM_SIZE_OK", severity: "info", page: page.page, message: "Format fini conforme au profil.", proof: `mesuré=${round(pointsToMm(width))}×${round(pointsToMm(height))} mm`, method: "Comparaison TrimBox après prise en compte de la rotation." });
      }
    }
  }

  const summary = {
    info: issues.filter((issue) => issue.severity === "info").length,
    warning: issues.filter((issue) => issue.severity === "warning").length,
    error: issues.filter((issue) => issue.severity === "error").length,
    unsupported: issues.filter((issue) => issue.severity === "unsupported").length,
  };
  return { version: "1", status: summary.error > 0 ? "fail" : summary.warning > 0 ? "warning" : "pass", profile, file: { bytes: bytes.byteLength, pages: pageCount, encrypted }, pages, issues, summary };
}

export function preflightStatusLabel(status: PreflightReport["status"]) {
  return status === "pass" ? "Conforme sur les contrôles disponibles" : status === "warning" ? "À vérifier avant production" : "Non conforme sur un ou plusieurs contrôles";
}
