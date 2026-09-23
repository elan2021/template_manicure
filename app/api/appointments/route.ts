import { NextResponse } from "next/server";
import { asNonNegativeInteger, asPositiveInteger, badRequest } from "@/lib/api";
import { db } from "@/lib/db";
import { sessionFor, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = sessionFor(request); if (!session) return unauthorized();
  const date = new URL(request.url).searchParams.get("date");
  const sql = `
    SELECT appointments.*, professionals.name AS professional_name, services.name AS service_name,
      services.duration_minutes, services.price_cents
    FROM appointments
    LEFT JOIN professionals ON professionals.id = appointments.professional_id
    LEFT JOIN services ON services.id = appointments.service_id
    WHERE appointments.studio_id = ? ${date ? "AND starts_at LIKE ?" : ""}
    ORDER BY starts_at`;
  const appointments = date ? db.prepare(sql).all(session.studioId, `${date}%`) : db.prepare(sql).all(session.studioId);
  return NextResponse.json({ data: appointments });
}

export async function POST(request: Request) {
  const session = sessionFor(request); if (!session) return unauthorized();
  const body = await request.json();
  const clientName = typeof body.clientName === "string" ? body.clientName.trim() : "";
  const startsAt = typeof body.startsAt === "string" ? body.startsAt : "";
  const professionalId = asPositiveInteger(body.professionalId);
  const serviceId = asPositiveInteger(body.serviceId);
  const depositCents = asNonNegativeInteger(body.depositCents ?? 0);
  const status = typeof body.status === "string" ? body.status : "scheduled";
  const allowedStatuses = ["scheduled", "confirmed", "pending_deposit", "completed", "cancelled"];

  if (!clientName || Number.isNaN(Date.parse(startsAt)) || professionalId === null || serviceId === null || depositCents === null || !allowedStatuses.includes(status)) {
    return badRequest("Informe cliente, início, profissional, serviço e status válidos.");
  }
  const professional = db.prepare("SELECT availability_json FROM professionals WHERE id = ? AND studio_id = ? AND status = 'active'").get(professionalId, session.studioId) as { availability_json: string } | undefined;
  const service = db.prepare("SELECT duration_minutes FROM services WHERE id = ? AND studio_id = ? AND active = 1").get(serviceId, session.studioId) as { duration_minutes: number } | undefined;
  if (!professional || !service) return badRequest("Profissional ou serviço indisponível neste estúdio.");
  const availability = JSON.parse(professional.availability_json || "{}");
  const start = new Date(startsAt);
  const day = start.getDay(); const minutes = start.getHours() * 60 + start.getMinutes();
  const toMinutes = (value: string) => { const [h, m] = String(value || "00:00").split(":").map(Number); return h * 60 + m; };
  if (Array.isArray(availability.days) && !availability.days.includes(day) || minutes < toMinutes(availability.start || "00:00") || minutes + Number(service.duration_minutes) > toMinutes(availability.end || "23:59")) return badRequest("Este horário está fora da disponibilidade da profissional.");
  const conflicting = db.prepare(`SELECT 1 FROM appointments a LEFT JOIN services s ON s.id = a.service_id WHERE a.studio_id = ? AND a.professional_id = ? AND a.status != 'cancelled' AND datetime(a.starts_at) < datetime(?, '+' || s.duration_minutes || ' minutes') AND datetime(?) < datetime(a.starts_at, '+' || ? || ' minutes') LIMIT 1`).get(session.studioId, professionalId, startsAt, startsAt, service.duration_minutes);
  if (conflicting) return NextResponse.json({ error: "Esta profissional já possui um atendimento nesse horário." }, { status: 409 });

  const result = db.prepare(`
    INSERT INTO appointments (studio_id, client_name, client_phone, starts_at, status, professional_id, service_id, deposit_cents, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(session.studioId, clientName, typeof body.clientPhone === "string" ? body.clientPhone : null, startsAt, status, professionalId, serviceId, depositCents, typeof body.notes === "string" ? body.notes : null);
  const appointment = db.prepare("SELECT * FROM appointments WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json({ data: appointment }, { status: 201 });
}
