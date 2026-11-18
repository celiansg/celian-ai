export type LocalFileKind = "pdf" | "image" | "document" | "archive" | "text" | "unknown";

export interface LocalFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  lastModified: number;
  sha256: string;
  createdAt: string;
  kind: LocalFileKind;
  projectId?: string;
  bat?: { revision: number; templateVersion: string; order?: string; product?: string };
}

export interface LocalFileRecord extends LocalFileMetadata {
  blob: Blob;
}

export interface LocalFileValidation {
  accepted: boolean;
  message?: string;
}
