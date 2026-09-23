import { NextResponse } from "next/server";
import { attachSession, createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest } from "@/lib/api";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const body = await request.json();
  let phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  if (phone.length === 11) phone = `55${phone}`;
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  const challenge = db.prepare("SELECT id FROM otp_challenges WHERE phone = ? AND code = ? AND expires_at > CURRENT_TIMESTAMP ORDER BY id DESC LIMIT 1").get(phone, code) as { id: number } | undefined;
  if (!challenge) return badRequest("Código inválido ou expirado.");
  db.prepare("DELETE FROM otp_challenges WHERE id = ?").run(challenge.id);
  let user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone) as { id: number; studio_id: number; role: string } | undefined;
  if (!user) {
    const slug = `studio-${randomSuffix()}`;
    const studio = db.prepare("INSERT INTO studios (name, slug, whatsapp) VALUES (?, ?, ?)").run("Meu Estúdio", slug, phone);
    const created = db.prepare("INSERT INTO users (studio_id, phone, role) VALUES (?, ?, 'owner')").run(studio.lastInsertRowid, phone);
    user = { id: Number(created.lastInsertRowid), studio_id: Number(studio.lastInsertRowid), role: "owner" };
  }
  const { token } = createSession(user.id);
  return attachSession(NextResponse.json({ data: { studioId: user.studio_id, role: user.role } }), token);
}
function randomSuffix() { return Math.random().toString(36).slice(2, 10); }
