export const driveIntegration = {
  id: "drive" as const,
  label: "Google Drive",
  async isConfigured() {
    return false;
  },
};
