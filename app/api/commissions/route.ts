import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionFor, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = sessionFor(request); if (!session) return unauthorized();
  const records = db.prepare(`
    SELECT appointments.id, appointments.starts_at, appointments.status, appointments.client_name,
      services.name AS service_name, services.category, services.price_cents,
      professionals.name AS professional_name, professionals.commission_rate,
      CAST(services.price_cents * professionals.commission_rate / 100 AS INTEGER) AS commission_cents
    FROM appointments
    INNER JOIN services ON services.id = appointments.service_id
    INNER JOIN professionals ON professionals.id = appointments.professional_id
    WHERE appointments.studio_id = ? AND appointments.status = 'completed'
    ORDER BY appointments.starts_at DESC
  `).all(session.studioId);

  const summary = db.prepare(`
    SELECT
      0 AS repassed_cents,
      COALESCE(SUM(services.price_cents * professionals.commission_rate / 100), 0) AS payable_cents,
      0 AS repassed_count,
      COUNT(*) AS payable_count
    FROM appointments
    INNER JOIN services ON services.id = appointments.service_id
    INNER JOIN professionals ON professionals.id = appointments.professional_id
    WHERE appointments.studio_id = ? AND appointments.status = 'completed'
  `).get(session.studioId);

  return NextResponse.json({ data: { records, summary } });
}
