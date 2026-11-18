import assert from "node:assert/strict";
import test from "node:test";
import { assistedMailRequestSchema, validatesMailReferences } from "../lib/mail/assisted.ts";

const link = "https://example.test/BAT?ref=123&access=A1";
const facts = `Le BAT est à relire. Lien : ${link}. Prix : 120 €.`;
const input = {
  consent: true, kind: "bat", order: "", product: "", facts, instructions: "Demande une relecture sans prix.",
  signature: "", tone: "naturel", length: "court", omitPrices: false,
};
const draft = { subject: "Bon à tirer", body: `Bonjour, pouvez-vous relire le BAT ? ${link}`, assumptions: [],
  sourceFactsUsed: ["Le BAT est à relire."], warnings: [] };

test("la requête exige un consentement explicite et refuse les données hors formulaire", () => {
  assert.equal(assistedMailRequestSchema.safeParse(input).success, true);
  assert.equal(assistedMailRequestSchema.safeParse({ ...input, consent: false }).success, false);
  assert.equal(assistedMailRequestSchema.safeParse({ ...input, file: "BAT.pdf" }).success, false);
});

test("les liens exacts sont acceptés et les références inventées rejetées", () => {
  assert.equal(validatesMailReferences(input, draft), true);
  assert.equal(validatesMailReferences(input, { ...draft, body: draft.body.replace("A1", "A2") }), false);
  assert.equal(validatesMailReferences(input, { ...draft, sourceFactsUsed: ["Le BAT est approuvé."] }), false);
});

test("la consigne sans prix rejette une proposition reproduisant le montant", () => {
  assert.equal(validatesMailReferences(input, { ...draft, body: draft.body + " Le devis est de 120 €." }), false);
  assert.equal(validatesMailReferences({ ...input, instructions: "Indique le montant." }, {
    ...draft, body: draft.body + " Le devis est de 120 €.",
  }), true);
});
