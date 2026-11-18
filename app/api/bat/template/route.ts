import { NextResponse } from "next/server";
import { getBatTemplateStatus } from "@/lib/bat/template";

export const runtime = "nodejs";

export async function GET() {
  const status = getBatTemplateStatus();
  return NextResponse.json(status, { status: status.available ? 200 : 503 });
}
