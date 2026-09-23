import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const studio = db.prepare("SELECT id, name FROM studios LIMIT 1").get();
  return NextResponse.json({ status: "ok", database: "sqlite", studio });
}
