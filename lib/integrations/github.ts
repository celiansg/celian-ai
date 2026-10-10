export const githubIntegration = {
  id: "github" as const,
  label: "GitHub",
  async isConfigured() {
    return false;
  },
};
