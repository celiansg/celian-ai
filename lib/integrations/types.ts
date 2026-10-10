export type IntegrationId = "gmail" | "calendar" | "drive" | "github" | "vercel";

export interface IntegrationStatus {
  id: IntegrationId;
  label: string;
  connected: boolean;
  description: string;
}
