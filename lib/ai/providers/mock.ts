import type { AIProvider, GenerateRequest, GenerateResponse } from "../types";

export class MockProvider implements AIProvider {
  readonly id = "gemini" as const;

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const prompt = request.prompt.toLowerCase();
    const agentId = request.context?.agentId;

    if (agentId === "client") {
      return {
        text: "La réponse client est prête. Je peux l’envoyer dès que vous l’avez validée.",
        requiresApproval: true,
        approvalDescription: "@Client souhaite envoyer le brouillon de réponse au client.",
      };
    }

    if (agentId === "prod") {
      return {
        text: "Je peux contrôler un BAT dès que vous aurez ajouté un fichier au workspace.",
        toolCall: { name: "listFiles", input: { projectId: request.context?.projectId } },
      };
    }

    if (prompt.includes("mail") || prompt.includes("client")) {
      return {
        text: "J’ai identifié une demande client et préparé les éléments de réponse.",
        toolCall: { name: "getRecentActivity", input: { limit: 3 } },
        handoff: "client",
      };
    }

    if (prompt.includes("bat") || prompt.includes("production") || prompt.includes("impression")) {
      return {
        text: "Je vérifie les contraintes de production et les informations manquantes.",
        toolCall: { name: "listFiles", input: { projectId: request.context?.projectId } },
        handoff: "prod",
      };
    }

    return {
      text: "J’ai structuré la demande et préparé une première action dans l’espace de travail.",
      toolCall: { name: "getRecentActivity", input: { limit: 5 } },
    };
  }
}
