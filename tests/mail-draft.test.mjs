import assert from "node:assert/strict";
import test from "node:test";
import { createMailDraft } from "../lib/mail/draft.ts";

test("un BAT révisé demande une relecture sans affirmer un envoi ou une correction", () => {
  const draft = createMailDraft({
    kind: "bat-revision", order: "QA-042", product: "Calendrier", request: "", signature: "",
  });
  assert.equal(draft.subject, "Nouvelle version du bon à tirer — Calendrier · commande QA-042");
  assert.match(draft.body, /confirmer votre accord/);
  assert.match(draft.body, /daté, signé et accompagné de la mention « Bon pour accord »/);
  assert.match(draft.body, /Cordialement,/);
  assert.doesNotMatch(draft.body, /Bien cordialement/);
  assert.doesNotMatch(draft.body, /ci-joint|corrigé|envoyé|€|https?:/);
});

test("le texte volontairement inclus garde le lien exact et le contenu de l’utilisateur", () => {
  const request = "Pouvez-vous relire le BAT ? Lien : https://example.test/BAT-v2?a=1&b=2";
  const draft = createMailDraft({ kind: "bat", order: "", product: "", request, signature: "Camille" });
  assert.equal(draft.subject, "Bon à tirer");
  assert.equal(draft.body, `Bonjour,\n\n${request}\n\nAvant le lancement en production, merci de nous retourner le BAT daté, signé et accompagné de la mention « Bon pour accord ».\n\nCordialement,\nCamille`);
});
