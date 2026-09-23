import { NextResponse } from "next/server";
import { sessionFor, unauthorized } from "@/lib/auth";
export const runtime = "nodejs";
export async function GET(request: Request) { const session = sessionFor(request); return session ? NextResponse.json({ data: session }) : unauthorized(); }
