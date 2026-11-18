import { z } from "zod";

export const assistedMailRequestSchema = z.strictObject({
  consent: z.literal(true),
  kind: z.enum(["bat", "bat-revision", "follow-up", "reply", "technical", "free"]),
  order: z.string().trim().max(160),
  product: z.string().trim().max(160),
  facts: z.string().trim().max(6000),
  instructions: z.string().trim().min(1).max(2000),
  signature: z.string().trim().max(160),
  tone: z.enum(["naturel", "cordial", "formel", "direct"]),
  length: z.enum(["court", "standard", "détaillé"]),
  omitPrices: z.boolean(),
});

const notes = z.array(z.string().trim().min(1).max(500)).max(8);

export const assistedMailDraftSchema = z.strictObject({
  subject: z.string().trim().min(1).max(350),
  body: z.string().trim().min(1).max(8000),
  assumptions: notes,
  sourceFactsUsed: notes,
  warnings: notes,
});

type AssistedMailRequest = z.infer<typeof assistedMailRequestSchema>;
export type AssistedMailDraft = z.infer<typeof assistedMailDraftSchema>;

const amounts = /€|\$|\b(?:EUR|euros?|USD|CHF|GBP)\b|\b(?:prix|tarif|montant|total)\s*(?:unitaire\s*)?[:=]?\s*\d/iu;

export function excludesMailPrices(input: AssistedMailRequest) {
  return input.omitPrices || /\b(?:sans|pas de)\s+(?:prix|tarifs?|montants?)\b/i.test(input.instructions);
}

function links(text: string) {
  return (text.match(/(?:https?:\/\/|www\.)[^\s<>()"'\]]+/gi) ?? []).map((url) => url.replace(/[.,;!?]+$/, ""));
}

export function validatesMailReferences(input: AssistedMailRequest, draft: AssistedMailDraft) {
  const supplied = [input.order, input.product, input.facts, input.signature].join("\n");
  const text = `${draft.subject}\n${draft.body}`;
  const allowedLinks = new Set(links(supplied));
  return !(excludesMailPrices(input) && amounts.test(text))
    && links(text).every((url) => allowedLinks.has(url))
    && draft.sourceFactsUsed.every((fact) => supplied.includes(fact));
}
