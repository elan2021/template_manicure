import { NextResponse } from "next/server";
import { asNonNegativeInteger, badRequest } from "@/lib/api";
import { db } from "@/lib/db";
import { sessionFor, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

const statuses = ["scheduled", "confirmed", "pending_deposit", "completed", "cancelled"];
const paymentStatuses = ["pending", "deposit_paid", "paid"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = sessionFor(request); if (!session) return unauthorized();
  const { id } = await params;
  const appointmentId = Number(id);
  if (!Number.isInteger(appointmentId) || appointmentId < 1) return badRequest("Agendamento inválido.");

  const body = await request.json();
  const current = db.prepare("SELECT * FROM appointments WHERE id = ? AND studio_id = ?").get(appointmentId, session.studioId);
  if (!current) return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 });

  const status = typeof body.status === "string" && statuses.includes(body.status) ? body.status : current.status;
  const paymentStatus = typeof body.paymentStatus === "string" && paymentStatuses.includes(body.paymentStatus) ? body.paymentStatus : current.payment_status;
  const depositCents = body.depositCents === undefined ? current.deposit_cents : asNonNegativeInteger(body.depositCents);
  const startsAt = typeof body.startsAt === "string" && !Number.isNaN(Date.parse(body.startsAt)) ? body.startsAt : current.starts_at;
  if (depositCents === null) return badRequest("Valor de sinal inválido.");

  db.prepare("UPDATE appointments SET status = ?, payment_status = ?, deposit_cents = ?, starts_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND studio_id = ?")
    .run(status, paymentStatus, depositCents, startsAt, appointmentId, session.studioId);
  return NextResponse.json({ data: db.prepare("SELECT * FROM appointments WHERE id = ? AND studio_id = ?").get(appointmentId, session.studioId) });
}
