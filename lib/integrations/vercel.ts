export const vercelIntegration = {
  id: "vercel" as const,
  label: "Vercel",
  async isConfigured() {
    return false;
  },
};
