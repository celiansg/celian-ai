export const mailKinds = [
  ["bat", "BAT initial"],
  ["bat-revision", "Nouvelle version du BAT"],
  ["follow-up", "Relance"],
  ["reply", "Réponse client"],
  ["technical", "Question technique"],
  ["free", "Mail libre"],
] as const;

export type MailKind = (typeof mailKinds)[number][0];

const batApprovalRequest = "Avant le lancement en production, merci de nous retourner le BAT daté, signé et accompagné de la mention « Bon pour accord ».";

type LocalMailInput = {
  kind: MailKind;
  order: string;
  product: string;
  request: string;
  signature: string;
};

export function createMailDraft({ kind, order, product, request, signature }: LocalMailInput) {
  const reference = order.trim().replace(/\s+/g, " ");
  const item = product.trim().replace(/\s+/g, " ");
  const detail = [item, reference && `commande ${reference}`].filter(Boolean).join(" · ");
  const title: Record<MailKind, string> = {
    bat: "Bon à tirer",
    "bat-revision": "Nouvelle version du bon à tirer",
    "follow-up": "Point de suivi",
    reply: "Suite à votre message",
    technical: "Précision technique",
    free: "",
  };
  const defaultBody: Record<MailKind, string> = {
    bat: "Pouvez-vous relire le bon à tirer et me confirmer votre accord ou m’indiquer les corrections à prévoir ?",
    "bat-revision": "Pouvez-vous relire cette version du bon à tirer et me confirmer votre accord ou me signaler les points à revoir ?",
    "follow-up": "Je reviens vers vous pour faire le point. Pouvez-vous me faire un retour lorsque vous aurez pu consulter le dossier ?",
    reply: "Merci pour votre message.",
    technical: "",
    free: "",
  };

  const requestedBody = request.trim() || defaultBody[kind];
  const body = ["bat", "bat-revision"].includes(kind) && !/bon pour accord/i.test(requestedBody)
    ? `${requestedBody}\n\n${batApprovalRequest}`
    : requestedBody;

  return {
    subject: [title[kind], detail].filter(Boolean).join(" — "),
    body: ["Bonjour,", body, ["Cordialement,", signature.trim()].filter(Boolean).join("\n")]
      .filter(Boolean).join("\n\n"),
  };
}
