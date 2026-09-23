import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const screens = {
  agenda: "Agenda de atendimentos",
  cadastro: "Cadastro do estabelecimento",
  comissoes: "Comissões e repasses",
  configuracoes: "Configurações e sinal",
  dashboard: "Dashboard do estúdio",
  login: "Login com OTP via WhatsApp",
  profissionais: "Profissionais da equipe",
  servicos: "Serviços e preços",
} as const;

type Screen = keyof typeof screens;

export function generateStaticParams() {
  return Object.keys(screens).map((screen) => ({ screen }));
}

export default async function PrototypePage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;

  if (!(screen in screens)) {
    notFound();
  }

  const validScreen = screen as Screen;
  const session = (await cookies()).get("lemail_session");
  if (validScreen !== "login" && !session) redirect("/login");

  return (
    <iframe className="prototype-frame" src={`/prototype/${validScreen}`} title={screens[validScreen]} />
  );
}
