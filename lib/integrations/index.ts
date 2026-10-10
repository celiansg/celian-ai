import type { IntegrationStatus } from "./types";

export const integrationStatuses: IntegrationStatus[] = [
  { id: "gmail", label: "Gmail", connected: false, description: "Messages et brouillons" },
  { id: "calendar", label: "Google Calendar", connected: false, description: "Échéances et rendez-vous" },
  { id: "drive", label: "Google Drive", connected: false, description: "Fichiers et contexte" },
  { id: "github", label: "GitHub", connected: false, description: "Dépôts et issues" },
  { id: "vercel", label: "Vercel", connected: false, description: "Déploiements et logs" },
];
