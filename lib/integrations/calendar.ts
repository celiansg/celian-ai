export const calendarIntegration = {
  id: "calendar" as const,
  label: "Google Calendar",
  async isConfigured() {
    return false;
  },
};
