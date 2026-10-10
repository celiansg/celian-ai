export const gmailIntegration = {
  id: "gmail" as const,
  label: "Gmail",
  async isConfigured() {
    return false;
  },
};
