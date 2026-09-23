import { NextRequest, NextResponse } from "next/server";

const internalRoutes = new Set(["login", "cadastro", "dashboard", "agenda", "servicos", "profissionais", "comissoes", "configuracoes", "s", "api", "prototype", "templates"]);

export function middleware(request: NextRequest) {
  const slug = request.nextUrl.pathname.slice(1);
  if (!slug || slug.includes("/") || internalRoutes.has(slug) || slug.includes(".")) return NextResponse.next();
  const url = request.nextUrl.clone(); url.pathname = `/s/${slug}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: "/:path*" };
