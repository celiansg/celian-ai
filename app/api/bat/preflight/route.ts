import { preflightLimits, preflightPdf, preflightProfiles } from "@/lib/bat/preflight";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > preflightLimits.maxBytes + 2 * 1024 * 1024) return Response.json({ error: "Le fichier dépasse la limite de 25 Mo." }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const profileId = String(form.get("profile") ?? "generic");
    if (!(file instanceof File)) return Response.json({ error: "Ajoutez un fichier PDF à contrôler." }, { status: 400 });
    if (file.size > preflightLimits.maxBytes) return Response.json({ error: "Le fichier dépasse la limite de 25 Mo." }, { status: 413 });
    const profile = preflightProfiles[profileId] ?? preflightProfiles.generic;
    const report = await preflightPdf(new Uint8Array(await file.arrayBuffer()), profile);
    return Response.json({ fileName: file.name, report }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Le PDF n’a pas pu être analysé. Vérifiez qu’il n’est pas protégé ou corrompu." }, { status: 422 });
  }
}
