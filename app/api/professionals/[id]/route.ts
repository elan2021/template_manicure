import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionFor, unauthorized } from "@/lib/auth";
import { badRequest } from "@/lib/api";

export const runtime = "nodejs";

async function context(request: Request, params: Promise<{ id: string }>) {
  const session = sessionFor(request);
  const { id } = await params;
  const professionalId = Number(id);
  if (!session) return { response: unauthorized() };
  if (!Number.isInteger(professionalId) || professionalId < 1) return { response: badRequest("Profissional inválida.") };
  const professional = db.prepare("SELECT * FROM professionals WHERE id = ? AND studio_id = ?").get(professionalId, session.studioId) as Record<string, unknown> | undefined;
  if (!professional) return { response: NextResponse.json({ error: "Profissional não encontrada." }, { status: 404 }) };
  return { session, professionalId, professional };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await context(request, params); if ("response" in current) return current.response;
  const body = await request.json();
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : String(current.professional.name);
  const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.replace(/\D/g, "") : current.professional.whatsapp;
  const availability = typeof body.availability === "object" && body.availability !== null ? JSON.stringify(body.availability) : current.professional.availability_json;
  db.prepare("UPDATE professionals SET name = ?, whatsapp = ?, availability_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND studio_id = ?")
    .run(name, whatsapp, availability, current.professionalId, current.session.studioId);
  return NextResponse.json({ data: db.prepare("SELECT * FROM professionals WHERE id = ?").get(current.professionalId) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await context(request, params); if ("response" in current) return current.response;
  const used = db.prepare("SELECT 1 FROM appointments WHERE professional_id = ? AND studio_id = ? LIMIT 1").get(current.professionalId, current.session.studioId);
  if (used) return NextResponse.json({ error: "Esta profissional possui agendamentos. Cancele ou transfira-os antes de excluir." }, { status: 409 });
  db.prepare("DELETE FROM professionals WHERE id = ? AND studio_id = ?").run(current.professionalId, current.session.studioId);
  return new NextResponse(null, { status: 204 });
}
