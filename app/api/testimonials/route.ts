import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessionFor, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = sessionFor(request); if (!session) return unauthorized();
  const data = db.prepare("SELECT id, client_name AS name, body AS text, rating, status, created_at FROM public_testimonials WHERE studio_id = ? ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC").all(session.studioId);
  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const session = sessionFor(request); if (!session) return unauthorized();
  if (session.role !== "owner") return NextResponse.json({ error: "Apenas a proprietária pode moderar comentários." }, { status: 403 });
  const body = await request.json(); const id = Number(body.id); const status = body.status;
  if (!Number.isSafeInteger(id) || id < 1 || !["approved", "rejected"].includes(status)) return NextResponse.json({ error: "Solicitação inválida." }, { status: 422 });
  const result = db.prepare("UPDATE public_testimonials SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND studio_id = ?").run(status, id, session.studioId);
  if (!result.changes) return NextResponse.json({ error: "Comentário não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
