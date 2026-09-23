export type BookingPeriod = "manha" | "tarde" | "noite";

export type BookingAppointment = { starts_at: string; duration_minutes: number };
type TimeRange = { start: number; end: number };

export function isBookingDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isBookingPeriod(value: unknown): value is BookingPeriod {
  return value === "manha" || value === "tarde" || value === "noite";
}

export function bookingMinutes(value: unknown): number | null {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function bookingPeriod(time: string): BookingPeriod {
  const minutes = bookingMinutes(time) ?? 0;
  return minutes < 720 ? "manha" : minutes < 1080 ? "tarde" : "noite";
}

// Public booking uses the same Brazilian local time as the studio agenda.
export function bookingStartsAt(date: string, time: string) {
  return `${date}T${time}:00-03:00`;
}

export function addBookingDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function readRange(value: unknown): TimeRange | null {
  if (!value || typeof value !== "object") return null;
  const range = value as Record<string, unknown>;
  const start = bookingMinutes(range.start);
  const end = bookingMinutes(range.end);
  return start !== null && end !== null && start < end ? { start, end } : null;
}

export function availableBookingTimes({
  date, durationMinutes, availabilityJson, appointments, now = Date.now(),
}: {
  date: string;
  durationMinutes: number;
  availabilityJson: string;
  appointments: BookingAppointment[];
  now?: number;
}): string[] {
  if (!isBookingDate(date) || !Number.isInteger(durationMinutes) || durationMinutes < 1) return [];
  let availability: Record<string, unknown>;
  try {
    availability = JSON.parse(availabilityJson);
    if (!availability || typeof availability !== "object") return [];
  } catch {
    return [];
  }
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (!Array.isArray(availability.days) || !availability.days.includes(day)) return [];
  const work = readRange(availability);
  if (!work) return [];
  const breaks: TimeRange[] = [];
  if (availability.breaks !== undefined) {
    if (!Array.isArray(availability.breaks)) return [];
    for (const item of availability.breaks) {
      if (item && Array.isArray(item.days) && !item.days.includes(day)) continue;
      const range = readRange(item);
      // Do not offer slots based on a malformed break configuration.
      if (!range) return [];
      breaks.push(range);
    }
  }
  const midnight = Date.parse(bookingStartsAt(date, "00:00"));
  const occupied = appointments.map((appointment) => {
    const start = Date.parse(appointment.starts_at);
    return { start, end: start + Number(appointment.duration_minutes) * 60_000 };
  });
  if (occupied.some(({ start, end }) => !Number.isFinite(start) || !Number.isFinite(end) || end <= start)) return [];
  const times: string[] = [];
  // Half-hour suggestions, anchored to the professional's actual opening time.
  for (let start = work.start; start + durationMinutes <= work.end; start += 30) {
    const end = start + durationMinutes;
    const startsAt = midnight + start * 60_000;
    const endsAt = midnight + end * 60_000;
    if (startsAt <= now || breaks.some((pause) => start < pause.end && end > pause.start)) continue;
    if (occupied.some((appointment) => startsAt < appointment.end && endsAt > appointment.start)) continue;
    times.push(`${Math.floor(start / 60)}`.padStart(2, "0") + ":" + `${start % 60}`.padStart(2, "0"));
  }
  return times;
}
