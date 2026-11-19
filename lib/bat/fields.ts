export const batFields = [
  ["company", "Société", 160],
  ["order", "Commande", 160],
  ["date", "Date", 80],
  ["contact", "Contact", 160],
  ["file", "Fichier", 160],
  ["product", "Produit", 160],
  ["material", "Matière", 160],
  ["finish", "Finition", 160],
  ["format", "Format", 160],
  ["quantity", "Quantité", 160],
  ["remarks", "Remarques", 2000],
] as const;

export type BatDraftInput = Partial<Record<(typeof batFields)[number][0], string | undefined>>;

export function filenameSegment(value: string, fallback: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 40) || fallback;
}
