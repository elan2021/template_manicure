import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api";
import { db } from "@/lib/db";
import { sessionFor, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

type StudioRecord = {
  name: string;
  whatsapp: string | null;
  deposit_value: number;
  settings: Record<string, unknown>;
} & Record<string, unknown>;

function studioResponse(studioId: number): StudioRecord | null {
  const studio = db.prepare("SELECT * FROM studios WHERE id = ?").get(studioId);
  if (!studio) return null;
  const settings = typeof studio.settings_json === "string" ? JSON.parse(studio.settings_json) : {};
  return { ...studio, settings } as StudioRecord;
}

export async function GET(request: Request) {
  const session = sessionFor(request); if (!session) return unauthorized();
  return NextResponse.json({ data: studioResponse(session.studioId) });
}

export async function PATCH(request: Request) {
  const session = sessionFor(request); if (!session) return unauthorized();
  if (session.role !== "owner") return NextResponse.json({ error: "Apenas a proprietária pode alterar configurações." }, { status: 403 });
  const body = await request.json();
  const current = studioResponse(session.studioId);
  if (!current) return NextResponse.json({ error: "Estúdio não encontrado." }, { status: 404 });

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : current.name;
  const slug = typeof body.slug === "string" && /^[a-z0-9-]+$/.test(body.slug.trim()) ? body.slug.trim() : current.slug;
  const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.replace(/\D/g, "") : current.whatsapp;
  const depositType = body.depositType === "percent" ? "percent" : "fixed";
  const depositValue = Number.isInteger(body.depositValue) && body.depositValue >= 0 ? body.depositValue : current.deposit_value;
  const settings = typeof body.settings === "object" && body.settings !== null ? { ...current.settings, ...body.settings } : current.settings;
  const ownerName = typeof body.ownerName === "string" && body.ownerName.trim() ? body.ownerName.trim() : null;

  if (!name) return badRequest("Informe o nome do estúdio.");

  try {
    db.prepare(`
      UPDATE studios
      SET name = ?, slug = ?, whatsapp = ?, deposit_type = ?, deposit_value = ?, settings_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, slug, whatsapp, depositType, depositValue, JSON.stringify(settings), session.studioId);
    if (ownerName) db.prepare("UPDATE users SET name = ? WHERE id = ?").run(ownerName, session.userId);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar as configurações." }, { status: 500 });
  }

  return NextResponse.json({ data: studioResponse(session.studioId) });
}
