import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { asNonNegativeInteger, asPositiveInteger, badRequest } from "@/lib/api";
import { sessionFor, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

function imageUrl(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2_100_000 || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return undefined;
  return value;
}

async function context(request: Request, params: Promise<{ id: string }>) {
  const session = sessionFor(request);
  const { id } = await params;
  const serviceId = asPositiveInteger(id);
  if (!session) return { response: unauthorized() };
  if (!serviceId) return { response: badRequest("Serviço inválido.") };
  const service = db.prepare("SELECT * FROM services WHERE id = ? AND studio_id = ?").get(serviceId, session.studioId) as Record<string, unknown> | undefined;
  if (!service) return { response: NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 }) };
  return { session, serviceId, service };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await context(request, params); if ("response" in current) return current.response;
  const body = await request.json();
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : String(current.service.name);
  const priceCents = body.priceCents === undefined ? Number(current.service.price_cents) : asNonNegativeInteger(body.priceCents);
  const durationMinutes = body.durationMinutes === undefined ? Number(current.service.duration_minutes) : asPositiveInteger(body.durationMinutes);
  const serviceImageUrl = body.imageUrl === undefined ? current.service.image_url : imageUrl(body.imageUrl);
  if (priceCents === null || durationMinutes === null || serviceImageUrl === undefined) return badRequest("Informe preço, duração e imagem válidos.");
  db.prepare("UPDATE services SET name = ?, price_cents = ?, duration_minutes = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND studio_id = ?")
    .run(name, priceCents, durationMinutes, serviceImageUrl, current.serviceId, current.session.studioId);
  return NextResponse.json({ data: db.prepare("SELECT * FROM services WHERE id = ? AND studio_id = ?").get(current.serviceId, current.session.studioId) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await context(request, params); if ("response" in current) return current.response;
  const used = db.prepare("SELECT 1 FROM appointments WHERE service_id = ? AND studio_id = ? LIMIT 1").get(current.serviceId, current.session.studioId);
  // Preserve historical appointments while removing the service from all active catalogs.
  if (used) {
    db.prepare("UPDATE services SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND studio_id = ?")
      .run(current.serviceId, current.session.studioId);
    return new NextResponse(null, { status: 204 });
  }
  db.prepare("DELETE FROM services WHERE id = ? AND studio_id = ?").run(current.serviceId, current.session.studioId);
  return new NextResponse(null, { status: 204 });
}
