import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const studio = db.prepare("SELECT id FROM studios WHERE slug = ?").get(slug) as { id: number } | undefined;
  if (!studio) return NextResponse.json({ error: "Estúdio não encontrado." }, { status: 404 });
  let data: { name?: unknown; text?: unknown; rating?: unknown };
  try { data = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  const name = typeof data.name === "string" ? data.name.trim().replace(/\s+/g, " ") : "";
  const text = typeof data.text === "string" ? data.text.trim().replace(/\s+/g, " ") : "";
  const rating = Number(data.rating);
  if (name.length < 2 || name.length > 80 || text.length < 5 || text.length > 500 || !Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Informe nome, comentário e uma avaliação de 1 a 5 estrelas." }, { status: 422 });
  db.prepare("INSERT INTO public_testimonials (studio_id, client_name, body, rating) VALUES (?, ?, ?, ?)").run(studio.id, name, text, rating);
  return NextResponse.json({ ok: true }, { status: 201 });
}
