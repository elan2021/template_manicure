import { NextResponse } from "next/server";
import { sessionFor, unauthorized } from "@/lib/auth";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { isValidTemplateId, normalizeAppointmentCtas } from "@/lib/template-booking";
export const runtime = "nodejs";
const templates = [
  { id: "atelier", name: "Ateliê", description: "Visual delicado e editorial para nail designers." },
  { id: "minimal", name: "Minimal", description: "Interface limpa com foco em agenda e conversão." },
  { id: "luxo", name: "Luxo", description: "Paleta sofisticada para estúdios premium." },
];
const uploaded: { id: string; name: string; description: string; previewUrl?: string }[] = [];
export async function GET(request: Request) { return sessionFor(request) ? NextResponse.json({ data: [...templates, ...uploaded] }) : unauthorized(); }
export async function POST(request: Request) {
  if (!sessionFor(request)) return unauthorized();
  const form = await request.formData(); const manifestFile = form.get('manifest'); const htmlFile = form.get('html'); const cssFile = form.get('css');
  if (!(manifestFile instanceof File) || !(htmlFile instanceof File) || !(cssFile instanceof File)) return NextResponse.json({ error: 'Envie theme.json, preview.html e preview.css.' }, { status: 422 });
  let manifest: { id?: string; name?: string; description?: string; slots?: unknown; requires?: unknown }; try { manifest = JSON.parse(await manifestFile.text()); } catch { return NextResponse.json({ error: 'theme.json inválido.' }, { status: 422 }); }
  if (!isValidTemplateId(manifest.id) || !manifest.name || !Array.isArray(manifest.slots) || !Array.isArray(manifest.requires)) return NextResponse.json({ error: 'Manifesto precisa de id, name, slots e requires válidos.' }, { status: 422 });
  const folder = join(process.cwd(), 'public', 'templates', 'uploaded', manifest.id); await mkdir(folder, { recursive: true });
  const previewHtml = normalizeAppointmentCtas(await htmlFile.text());
  await writeFile(join(folder, 'preview.html'), previewHtml); await writeFile(join(folder, 'preview.css'), await cssFile.text());
  const assetsFolder = join(folder, 'assets'); await mkdir(assetsFolder, { recursive: true });
  for (const asset of form.getAll('assets')) if (asset instanceof File && /^image\/(png|jpeg|webp|svg\+xml)$/.test(asset.type)) await writeFile(join(assetsFolder, asset.name.replace(/[^a-zA-Z0-9._-]/g, '-')), Buffer.from(await asset.arrayBuffer()));
  const item = { id: manifest.id, name: manifest.name, description: manifest.description || 'Template enviado', previewUrl: `/templates/uploaded/${manifest.id}/preview.html` };
  const index = uploaded.findIndex((x) => x.id === item.id); if (index >= 0) uploaded[index] = item; else uploaded.push(item);
  return NextResponse.json({ data: item }, { status: 201 });
}
export async function DELETE(request: Request) {
  if (!sessionFor(request)) return unauthorized(); const id = new URL(request.url).searchParams.get('id') || ''; const index = uploaded.findIndex((item) => item.id === id);
  if (index < 0) return NextResponse.json({ error: 'Somente temas enviados podem ser excluídos.' }, { status: 403 });
  await rm(join(process.cwd(), 'public', 'templates', 'uploaded', id), { recursive: true, force: true }); uploaded.splice(index, 1); return new NextResponse(null, { status: 204 });
}
