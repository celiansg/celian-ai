import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { firebaseStorage } from "./client";

const allowedMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/svg+xml", "text/plain", "application/zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
const maxFileSize = 25 * 1024 * 1024;

export async function uploadWorkspaceFile(userId: string, file: File, projectId?: string) {
  if (!firebaseStorage) {
    throw new Error("Les uploads cloud sont désactivés sur le forfait Spark. Activez Blaze uniquement si vous souhaitez utiliser Firebase Storage.");
  }
  if (!allowedMimeTypes.has(file.type)) throw new Error("Ce type de fichier n’est pas supporté.");
  if (file.size > maxFileSize) throw new Error("Le fichier dépasse la limite de 25 Mo.");
  const path = `users/${userId}/files/${projectId ?? "inbox"}/${crypto.randomUUID()}-${file.name}`;
  const fileRef = ref(firebaseStorage, path);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return { path, url: await getDownloadURL(fileRef), name: file.name, mimeType: file.type, size: file.size };
}
