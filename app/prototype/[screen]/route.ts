import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { dynamicBindings } from "@/lib/prototype-dynamic";

const screens = new Set([
  "agenda",
  "cadastro",
  "comissoes",
  "configuracoes",
  "dashboard",
  "login",
  "profissionais",
  "servicos",
]);

const menuRoutes: Record<string, string> = {
  inicio: "/dashboard",
  agenda: "/agenda",
  comissoes: "/comissoes",
  servicos: "/servicos",
  ajustes: "/configuracoes",
};

export async function GET(_: Request, { params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;

  if (!screens.has(screen)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const source = await readFile(join(process.cwd(), "public", "prototypes", screen, "index.html"), "utf8");
  const logoImage = /<img alt="L'Émail Studio Logo"[^>]*>/g;
  const withoutLogoImage =
    screen === "login"
      ? source.replace(logoImage, '<span class="font-title-lg text-title-lg text-primary leading-tight">L’Émail Studio</span>')
      : source.replace(logoImage, "");
  const teamAndServicesRoute = screen === "profissionais" ? "/servicos" : "/profissionais";
  const navigationWithServices = linkedMenuItem(withoutLogoImage);
  const linkedMenu = Object.entries({ ...menuRoutes, "equipe-e-servicos": teamAndServicesRoute }).reduce(
    (html, [menuPath, destination]) =>
      html.replaceAll(`data-path="${menuPath}" href="#"`, `data-path="${menuPath}" href="${destination}" target="_top"`),
    navigationWithServices,
  );

  const hydrationGuard = screen === "login"
    ? ""
    : `<style>body{opacity:0;transition:opacity .12s ease}body.prototype-ready{opacity:1}</style><script>window.addEventListener('prototype-ready',()=>document.body.classList.add('prototype-ready'));</script>`;
  const serviceMockGuard = screen === "servicos"
    ? '<style>#servicesList .service-card:not([data-real-service]),#service-category-filters{display:none!important}</style>'
    : "";
  const guardedPrototype = linkedMenu.replace("</head>", () => `${hydrationGuard}${serviceMockGuard}</head>`);
  const dynamicPrototype = guardedPrototype.replace("</body>", () => `${dynamicBindings(screen)}<script>setTimeout(()=>window.dispatchEvent(new Event('prototype-ready')),700);</script></body>`);

  return new NextResponse(dynamicPrototype, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, max-age=0" },
  });
}

function linkedMenuItem(html: string) {
  return html
    .replaceAll('data-path="comissoes" href="#"', 'data-path="servicos" href="#"')
    .replaceAll('>Comissões</span>', '>Serviços</span>');
}
