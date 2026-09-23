import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidTemplateId, renderBookingTemplate } from "@/lib/template-booking";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const studio = db.prepare("SELECT name, settings_json FROM studios WHERE slug = ?").get(slug) as { name: string; settings_json: string } | undefined;
  if (!studio) return new NextResponse("Estúdio não encontrado.", { status: 404 });
  try {
    const settings = JSON.parse(studio.settings_json || "{}");
    const templateId: unknown = settings.templateId;
    if (!isValidTemplateId(templateId)) return new NextResponse("Envie e ative um template para publicar este estúdio.", { status: 404 });
    const html = await readFile(join(process.cwd(), "public", "templates", "uploaded", templateId, "preview.html"), "utf8");
    return new NextResponse(renderBookingTemplate(html, { slug, templateId, studioName: studio.name }), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse("Envie e ative um template para publicar este estúdio.", { status: 404 });
  }
}
