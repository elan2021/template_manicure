import { NextResponse } from "next/server";
import { asNonNegativeInteger, asPositiveInteger, badRequest } from "@/lib/api";
import { db } from "@/lib/db";
import { sessionFor, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";

function imageUrl(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2_100_000 || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return undefined;
  return value;
}

export async function GET(request: Request) {
  const session = sessionFor(request); if (!session) return unauthorized();
  const { searchParams } = new URL(request.url);
  const active = searchParams.get("active");
  const category = searchParams.get("category");
  const clauses: string[] = ["studio_id = ?"];
  const values: unknown[] = [session.studioId];

  if (active === "true" || active === "false") {
    clauses.push("active = ?");
    values.push(active === "true" ? 1 : 0);
  }
  if (category) {
    clauses.push("category = ?");
    values.push(category);
  }

  const services = db.prepare(`SELECT * FROM services WHERE ${clauses.join(" AND ")} ORDER BY active DESC, name`).all(...values);
  return NextResponse.json({ data: services });
}

export async function POST(request: Request) {
  const session = sessionFor(request); if (!session) return unauthorized();
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const priceCents = asNonNegativeInteger(body.priceCents);
  const durationMinutes = asPositiveInteger(body.durationMinutes);
  const serviceImageUrl = imageUrl(body.imageUrl);

  if (!name || !category || priceCents === null || durationMinutes === null || serviceImageUrl === undefined) {
    return badRequest("Informe nome, categoria, preço em centavos e duração em minutos.");
  }

  const result = db.prepare(`INSERT INTO services (studio_id, name, category, price_cents, duration_minutes, image_url, active) VALUES (?, ?, ?, ?, ?, ?, 1)`).run(session.studioId, name, category, priceCents, durationMinutes, serviceImageUrl);
  const service = db.prepare("SELECT * FROM services WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json({ data: service }, { status: 201 });
}
