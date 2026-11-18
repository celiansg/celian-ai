export type MailDraft = {
  subject: string;
  body: string;
};

export type MailVersion = MailDraft & {
  id: string;
  createdAt: string;
  batId?: string;
};
