import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  addBookingDays, availableBookingTimes, bookingMinutes, bookingPeriod, bookingStartsAt,
  isBookingDate, isBookingPeriod, type BookingAppointment, type BookingPeriod,
} from "@/lib/public-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ slug: string }> };
type Studio = { id: number; name: string; whatsapp: string | null; settings_json: string };
type Service = { id: number; duration_minutes: number };
type Professional = { id: number; availability_json: string };

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

function positiveId(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function studio(slug: string) {
  return db.prepare("SELECT id, name, whatsapp, settings_json FROM studios WHERE slug = ?").get(slug) as Studio | undefined;
}

function publicGallery(currentStudio: Studio) {
  try {
    const settings = JSON.parse(currentStudio.settings_json || "{}") as { publicResultsEnabled?: unknown; publicResultImages?: unknown };
    if (settings.publicResultsEnabled !== true || !Array.isArray(settings.publicResultImages)) return [];
    return settings.publicResultImages.filter((image): image is string => typeof image === "string" && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)).slice(0, 3);
  } catch { return []; }
}

function publicTestimonials(studioId: number) {
  return db.prepare("SELECT id, client_name AS name, body AS text, rating FROM public_testimonials WHERE studio_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 3").all(studioId);
}

function service(studioId: number, id: number) {
  return db.prepare("SELECT id, duration_minutes FROM services WHERE studio_id = ? AND id = ? AND active = 1")
    .get(studioId, id) as Service | undefined;
}

function professional(studioId: number, id: number) {
  return db.prepare("SELECT id, availability_json FROM professionals WHERE studio_id = ? AND id = ? AND status = 'active'")
    .get(studioId, id) as Professional | undefined;
}

function times(studioId: number, selectedService: Service, selectedProfessional: Professional, date: string) {
  const appointments = db.prepare(`
    SELECT a.starts_at, COALESCE(s.duration_minutes, 1440) AS duration_minutes
    FROM appointments a LEFT JOIN services s ON s.id = a.service_id AND s.studio_id = a.studio_id
    WHERE a.studio_id = ? AND a.professional_id = ? AND a.status != 'cancelled'
      AND datetime(a.starts_at) < datetime(?)
      AND datetime(a.starts_at, '+' || COALESCE(s.duration_minutes, 1440) || ' minutes') > datetime(?)
  `).all(studioId, selectedProfessional.id, bookingStartsAt(addBookingDays(date, 1), "00:00"), bookingStartsAt(date, "00:00")) as BookingAppointment[];
  return availableBookingTimes({
    date, durationMinutes: Number(selectedService.duration_minutes),
    availabilityJson: selectedProfessional.availability_json, appointments,
  });
}

export async function GET(request: Request, { params }: Context) {
  const { slug } = await params;
  const currentStudio = studio(slug);
  if (!currentStudio) return json({ error: "Estúdio não encontrado." }, 404);
  const query = new URL(request.url).searchParams;
  if (!query.has("serviceId")) {
    return json({
      studio: { name: currentStudio.name, whatsapp: currentStudio.whatsapp, gallery: publicGallery(currentStudio), testimonials: publicTestimonials(currentStudio.id) },
      services: db.prepare("SELECT id, name, duration_minutes, price_cents, image_url FROM services WHERE studio_id = ? AND active = 1 ORDER BY name").all(currentStudio.id),
    });
  }
  const serviceId = positiveId(query.get("serviceId"));
  const selectedService = serviceId ? service(currentStudio.id, serviceId) : undefined;
  if (!selectedService) return json({ error: "Serviço indisponível neste estúdio." }, 422);
  if (!query.has("professionalId")) {
    return json({ professionals: db.prepare("SELECT id, name FROM professionals WHERE studio_id = ? AND status = 'active' ORDER BY name").all(currentStudio.id) });
  }
  const professionalId = positiveId(query.get("professionalId"));
  const selectedProfessional = professionalId ? professional(currentStudio.id, professionalId) : undefined;
  if (!selectedProfessional) return json({ error: "Profissional indisponível neste estúdio." }, 422);
  const date = query.get("date");
  const period = query.get("period");
  if (!isBookingDate(date) || !isBookingPeriod(period)) return json({ error: "Escolha uma data e um período válidos." }, 422);
  const available = times(currentStudio.id, selectedService, selectedProfessional, date);
  const slots = available.filter((time) => bookingPeriod(time) === period).slice(0, 2);
  const alternatives: { date: string; time: string; period: BookingPeriod }[] = [];
  if (!slots.length) {
    alternatives.push(...available.slice(0, 2).map((time) => ({ date, time, period: bookingPeriod(time) })));
    // When the entire day is full, check only the next seven days.
    for (let offset = 1; !alternatives.length && offset <= 7; offset++) {
      const otherDate = addBookingDays(date, offset);
      alternatives.push(...times(currentStudio.id, selectedService, selectedProfessional, otherDate).slice(0, 2)
        .map((time) => ({ date: otherDate, time, period: bookingPeriod(time) })));
    }
  }
  return json({ slots, alternatives });
}

export async function POST(request: Request, { params }: Context) {
  const { slug } = await params;
  const currentStudio = studio(slug);
  if (!currentStudio) return json({ error: "Estúdio não encontrado." }, 404);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
  } catch {
    return json({ error: "Envie os dados do agendamento em formato válido." }, 400);
  }
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  let phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
  const serviceId = positiveId(body.serviceId);
  const professionalId = positiveId(body.professionalId);
  const date = body.date;
  const time = body.time;
  if (name.length < 2 || name.length > 120 || !/^55\d{10,11}$/.test(phone) || !serviceId || !professionalId || !isBookingDate(date) || typeof time !== "string" || bookingMinutes(time) === null) {
    return json({ error: "Informe nome, WhatsApp com DDD, serviço, profissional, data e horário válidos." }, 422);
  }
  if (Date.parse(bookingStartsAt(date, time)) <= Date.now()) return json({ error: "Escolha um horário futuro." }, 422);

  // Availability is checked again under a write lock to prevent simultaneous bookings.
  let transaction = false;
  try {
    db.exec("BEGIN IMMEDIATE");
    transaction = true;
    const selectedService = service(currentStudio.id, serviceId);
    const selectedProfessional = professional(currentStudio.id, professionalId);
    if (!selectedService || !selectedProfessional) {
      db.exec("ROLLBACK");
      transaction = false;
      return json({ error: "Profissional ou serviço indisponível neste estúdio." }, 422);
    }
    if (!times(currentStudio.id, selectedService, selectedProfessional, date).includes(time)) {
      db.exec("ROLLBACK");
      transaction = false;
      return json({ error: "Esse horário não está mais disponível. Escolha outro horário." }, 409);
    }
    const result = db.prepare(`
      INSERT INTO appointments (studio_id, client_name, client_phone, starts_at, status, professional_id, service_id, deposit_cents)
      VALUES (?, ?, ?, ?, 'scheduled', ?, ?, 0)
    `).run(currentStudio.id, name, phone, bookingStartsAt(date, time), professionalId, serviceId);
    db.exec("COMMIT");
    transaction = false;
    return json({ id: Number(result.lastInsertRowid) }, 201);
  } catch (error) {
    if (transaction) db.exec("ROLLBACK");
    console.error("Public booking could not be saved", error);
    return json({ error: "Não foi possível salvar o agendamento agora. Tente novamente." }, 503);
  }
}
