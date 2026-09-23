import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionFor, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = sessionFor(request); if (!session) return unauthorized();
  const metrics = db.prepare(`
    SELECT
      COUNT(*) AS appointments_count,
      COALESCE(SUM(services.price_cents), 0) AS planned_revenue_cents,
      COALESCE(SUM(CASE WHEN appointments.status = 'completed' THEN services.price_cents ELSE 0 END), 0) AS received_revenue_cents,
      COALESCE(ROUND(AVG(services.price_cents)), 0) AS average_ticket_cents,
      COALESCE(SUM(appointments.deposit_cents), 0) AS deposits_cents,
      SUM(CASE WHEN appointments.status = 'pending_deposit' THEN 1 ELSE 0 END) AS pending_deposits_count
    FROM appointments
    LEFT JOIN services ON services.id = appointments.service_id
    WHERE appointments.studio_id = ? AND appointments.status != 'cancelled'
  `).get(session.studioId);

  const upcoming = db.prepare(`
    SELECT appointments.id, appointments.client_name, appointments.client_phone, appointments.starts_at,
      appointments.status, appointments.payment_status, appointments.deposit_cents, services.name AS service_name, services.price_cents,
      professionals.name AS professional_name
    FROM appointments
    LEFT JOIN services ON services.id = appointments.service_id
    LEFT JOIN professionals ON professionals.id = appointments.professional_id
    WHERE appointments.studio_id = ? AND appointments.status NOT IN ('cancelled', 'completed')
      AND datetime(appointments.starts_at) >= datetime('now')
    ORDER BY appointments.starts_at
    LIMIT 3
  `).all(session.studioId);

  const commissions = db.prepare(`
    SELECT professionals.id, professionals.name, professionals.commission_rate,
      COALESCE(SUM(services.price_cents * professionals.commission_rate / 100), 0) AS commission_cents
    FROM professionals
    LEFT JOIN appointments ON appointments.professional_id = professionals.id AND appointments.status != 'cancelled'
    LEFT JOIN services ON services.id = appointments.service_id
    WHERE professionals.studio_id = ?
    GROUP BY professionals.id
    ORDER BY commission_cents DESC, professionals.name
    LIMIT 2
  `).all(session.studioId);

  return NextResponse.json({ data: { metrics, upcoming, commissions } });
}
