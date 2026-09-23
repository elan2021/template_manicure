import "server-only";

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const COOKIE = "lemail_session";
const day = 24 * 60 * 60 * 1000;

export type Session = { userId: number; studioId: number; role: string; phone: string; name: string | null };

export function sessionFor(request: Request): Session | null {
  const token = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))?.[1];
  if (!token) return null;
  const row = db.prepare(`SELECT users.id AS user_id, users.studio_id, users.role, users.phone, users.name
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ? AND sessions.expires_at > CURRENT_TIMESTAMP`).get(token) as Record<string, unknown> | undefined;
  return row ? { userId: Number(row.user_id), studioId: Number(row.studio_id), role: String(row.role), phone: String(row.phone), name: typeof row.name === "string" ? row.name : null } : null;
}

export function unauthorized() { return NextResponse.json({ error: "Faça login para acessar este estúdio." }, { status: 401 }); }

export function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + 30 * day).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires);
  return { token, expires };
}

export function attachSession(response: NextResponse, token: string) {
  response.cookies.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 24 * 60 * 60 });
  return response;
}
