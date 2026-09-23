import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { badRequest } from "@/lib/api";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const { phone: rawPhone } = await request.json();
  let phone = typeof rawPhone === "string" ? rawPhone.replace(/\D/g, "") : "";
  if (phone.length === 11) phone = `55${phone}`;
  if (phone.length < 12 || phone.length > 15) return badRequest("Informe um WhatsApp válido com DDI e DDD.");
  const code = process.env.OTP_TEST_CODE || "123456";
  db.prepare("DELETE FROM otp_challenges WHERE phone = ? OR expires_at <= CURRENT_TIMESTAMP").run(phone);
  db.prepare("INSERT INTO otp_challenges (phone, code, expires_at) VALUES (?, ?, ?)").run(phone, code, new Date(Date.now() + 10 * 60 * 1000).toISOString());
  const known = db.prepare("SELECT 1 FROM users WHERE phone = ?").get(phone);
  return NextResponse.json({ data: { expiresInSeconds: 600, isNewUser: !known, ...(process.env.NODE_ENV !== "production" ? { developmentCode: code } : {}) } });
}
