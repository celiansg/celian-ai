import type { LocalFileKind, LocalFileMetadata, LocalFileRecord, LocalFileValidation } from "./types";
import { filenameSegment } from "../bat/fields";

const DATABASE_NAME = "agents-local-workspace";
const DATABASE_VERSION = 2;
const FILE_STORE = "files";
const BAT_REVISIONS = "batRevisions";
export const LOCAL_FILE_ACCEPT = [".pdf", ".png", ".jpg", ".jpeg", ".svg", ".docx", ".xlsx", ".txt", ".zip"] as const;

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  zip: "application/zip",
};

function assertBrowser() {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    throw new Error("Le stockage local n’est pas disponible dans cet environnement.");
  }
}

function getExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function getKind(file: File): LocalFileKind {
  if (file.type === "application/pdf" || getExtension(file.name) === "pdf") return "pdf";
  if (file.type.startsWith("image/") || ["png", "jpg", "jpeg", "svg"].includes(getExtension(file.name))) return "image";
  if (["docx", "xlsx"].includes(getExtension(file.name))) return "document";
  if (getExtension(file.name) === "zip") return "archive";
  if (file.type === "text/plain" || getExtension(file.name) === "txt") return "text";
  return "unknown";
}

export function validateLocalFile(file: File): LocalFileValidation {
  const extension = getExtension(file.name);
  const expectedMime = MIME_BY_EXTENSION[extension];
  const typeAccepted = Boolean(expectedMime) && (!file.type || file.type === expectedMime || (extension === "jpg" && file.type === "image/jpeg") || (extension === "jpeg" && file.type === "image/jpeg"));
  if (!typeAccepted) return { accepted: false, message: `${file.name} n’est pas un format supporté.` };
  if (file.size === 0) return { accepted: false, message: `${file.name} est vide.` };
  return { accepted: true };
}

function openDatabase(): Promise<IDBDatabase> {
  assertBrowser();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Impossible d’ouvrir le stockage local."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(FILE_STORE)) {
        const store = database.createObjectStore(FILE_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("kind", "kind", { unique: false });
      }
      if (!database.objectStoreNames.contains(BAT_REVISIONS)) database.createObjectStore(BAT_REVISIONS);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionRequest<T>(requestFactory: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode): Promise<T> {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(FILE_STORE, mode);
    const request = requestFactory(transaction.objectStore(FILE_STORE));
    transaction.oncomplete = () => {
      database.close();
      resolve(request.result);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Le stockage local a échoué."));
    };
  }));
}

async function sha256(file: Blob) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function saveLocalBat(
  blob: Blob,
  { projectId, order, company, product, templateVersion }: {
    projectId?: string; order: string; company: string; product?: string; templateVersion: string;
  },
): Promise<LocalFileMetadata> {
  if (!blob.size) throw new Error("Le brouillon est vide.");
  const now = new Date();
  const date = now.toISOString();
  const series = JSON.stringify([projectId ?? "", order.trim().normalize("NFC").toLocaleLowerCase("fr"),
    order.trim() ? "" : company.trim().normalize("NFC").toLocaleLowerCase("fr")]);
  const digest = await sha256(blob);
  const id = crypto.randomUUID();
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([BAT_REVISIONS, FILE_STORE], "readwrite");
    const revisions = transaction.objectStore(BAT_REVISIONS);
    const files = transaction.objectStore(FILE_STORE);
    const previous = revisions.get(series);
    let metadata: LocalFileMetadata;

    previous.onsuccess = () => {
      const revision = (previous.result ?? 0) + 1;
      const safeOrder = filenameSegment(order, "sans-commande");
      const safeCompany = filenameSegment(company, "sans-societe");
      metadata = {
        id,
        name: `BAT_${safeOrder}_${safeCompany}_${date.slice(0, 10)}_v${revision}.pdf`,
        mimeType: "application/pdf",
        size: blob.size,
        lastModified: now.getTime(),
        sha256: digest,
        createdAt: date,
        kind: "pdf",
        projectId,
        bat: { revision, templateVersion, order: order || undefined, product: product || undefined },
      };
      revisions.put(revision, series);
      files.add({ ...metadata, blob } satisfies LocalFileRecord);
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(metadata);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Impossible d’archiver le brouillon."));
    };
  });
}

export async function saveLocalFile(file: File): Promise<LocalFileMetadata> {
  const validation = validateLocalFile(file);
  if (!validation.accepted) throw new Error(validation.message);
  const metadata: LocalFileMetadata = {
    id: crypto.randomUUID(),
    name: file.name,
    mimeType: file.type || MIME_BY_EXTENSION[getExtension(file.name)] || "application/octet-stream",
    size: file.size,
    lastModified: file.lastModified,
    sha256: await sha256(file),
    createdAt: new Date().toISOString(),
    kind: getKind(file),
  };
  await transactionRequest((store) => store.put({ ...metadata, blob: file.slice(0, file.size, metadata.mimeType) }), "readwrite");
  return metadata;
}

export async function listLocalFiles(): Promise<LocalFileMetadata[]> {
  const records = await transactionRequest<LocalFileRecord[]>((store) => store.getAll(), "readonly");
  return records
    .map((record) => ({
      id: record.id,
      name: record.name,
      mimeType: record.mimeType,
      size: record.size,
      lastModified: record.lastModified,
      sha256: record.sha256,
      createdAt: record.createdAt,
      kind: record.kind,
      projectId: record.projectId,
      bat: record.bat,
    }))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getLocalFile(id: string): Promise<LocalFileRecord | null> {
  return (await transactionRequest<LocalFileRecord | undefined>((store) => store.get(id), "readonly")) ?? null;
}

export async function deleteLocalFile(id: string): Promise<void> {
  await transactionRequest((store) => store.delete(id), "readwrite");
}

export async function updateLocalFileProject(id: string, projectId?: string): Promise<LocalFileMetadata> {
  const record = await getLocalFile(id);
  if (!record) throw new Error("Fichier introuvable.");
  if (record.bat) throw new Error("Le projet d’une version BAT archivée ne peut pas être modifié.");
  const updated = { ...record, projectId: projectId || undefined };
  await transactionRequest((store) => store.put(updated), "readwrite");
  return {
    id: updated.id,
    name: updated.name,
    mimeType: updated.mimeType,
    size: updated.size,
    lastModified: updated.lastModified,
    sha256: updated.sha256,
    createdAt: updated.createdAt,
    kind: updated.kind,
    projectId: updated.projectId,
    bat: updated.bat,
  };
}

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / 1024 / 1024).toFixed(2)} Mo`;
}
