import { NextResponse } from "next/server";
import { asNonNegativeInteger, badRequest } from "@/lib/api";
import { db } from "@/lib/db";
import { sessionFor, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = sessionFor(request); if (!session) return unauthorized();
  const professionals = db.prepare("SELECT * FROM professionals WHERE studio_id = ? ORDER BY status, name").all(session.studioId);
  return NextResponse.json({ data: professionals });
}

export async function POST(request: Request) {
  const session = sessionFor(request); if (!session) return unauthorized();
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.trim() : null;
  const specialty = typeof body.specialty === "string" ? body.specialty.trim() : null;
  const commissionRate = asNonNegativeInteger(body.commissionRate);

  if (!name || commissionRate === null || commissionRate > 100) {
    return badRequest("Informe nome e comissão entre 0 e 100.");
  }

  const result = db.prepare(`INSERT INTO professionals (studio_id, name, whatsapp, specialty, commission_rate) VALUES (?, ?, ?, ?, ?)`).run(session.studioId, name, whatsapp, specialty, commissionRate);
  const professional = db.prepare("SELECT * FROM professionals WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json({ data: professional }, { status: 201 });
}
