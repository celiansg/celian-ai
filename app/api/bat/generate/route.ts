import { z } from "zod";
import { BatFieldError, generateBatDraft } from "@/lib/bat/template";

export const runtime = "nodejs";

const batDraftSchema = z.object({
  company: z.string().max(160).optional(),
  order: z.string().max(160).optional(),
  date: z.string().max(80).optional(),
  contact: z.string().max(160).optional(),
  file: z.string().max(160).optional(),
  product: z.string().max(160).optional(),
  material: z.string().max(160).optional(),
  finish: z.string().max(160).optional(),
  format: z.string().max(160).optional(),
  quantity: z.string().max(160).optional(),
  remarks: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const input = batDraftSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return Response.json({ error: "Les champs du BAT sont invalides ou trop longs.", status: "not_generated" }, { status: 400 });
  }
  try {
    const bytes = await generateBatDraft(input.data);
    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="BAT-brouillon.pdf"',
        "X-Agents-Bat-Status": "draft-unvalidated",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const invalidField = error instanceof BatFieldError;
    const message = invalidField ? error.message : "Impossible de produire le brouillon avec le modèle BAT officiel.";
    return Response.json({ error: message, status: "not_generated" }, { status: invalidField ? 422 : 503 });
  }
}
