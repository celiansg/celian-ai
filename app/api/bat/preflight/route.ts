import { preflightPdf, preflightProfiles } from "@/lib/bat/preflight";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const profileId = String(form.get("profile") ?? "generic");
    if (!(file instanceof File)) return Response.json({ error: "Ajoutez un fichier PDF à contrôler." }, { status: 400 });
    const profile = preflightProfiles[profileId] ?? preflightProfiles.generic;
    const report = await preflightPdf(new Uint8Array(await file.arrayBuffer()), profile);
    return Response.json({ fileName: file.name, report }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Le PDF n’a pas pu être analysé. Vérifiez qu’il n’est pas protégé ou corrompu." }, { status: 422 });
  }
}
