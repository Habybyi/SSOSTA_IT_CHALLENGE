import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest } from "../../lib/httpError.js";
import { parse } from "../../lib/validate.js";
import { optionalText } from "../../lib/fields.js";
import { addDays, dayEnd, dayKey, dayStart, dbDate, dbDateToDay, eachDay, isDay, isoWeekday } from "../../lib/dates.js";
import { logAudit } from "../audit/audit.service.js";
import { getScheduleSettings } from "./settings.service.js";

// Výjazdy, ktoré zaberajú kapacitu dňa (aj rezervácie zo webu).
export const ACTIVE_APPOINTMENT_STATUSES = ["RESERVED", "CONFIRMED", "DONE"];

const MAX_RANGE_DAYS = 92;

export function parseRange(query) {
  const { from, to } = query;
  if (!isDay(from) || !isDay(to) || from > to) throw badRequest("Zadaj platné obdobie (from, to v tvare RRRR-MM-DD).");
  if (eachDay(from, to).length > MAX_RANGE_DAYS) throw badRequest("Obdobie môže mať najviac 3 mesiace.");
  return { from, to };
}

// Kapacita po dňoch: koľko výjazdov sa zmestí, koľko je obsadených a či je deň pracovný.
export async function getCapacity(from, to, { excludeAppointmentId } = {}) {
  const settings = await getScheduleSettings();
  const [overrides, appointments] = await Promise.all([
    prisma.dayCapacity.findMany({ where: { date: { gte: dbDate(from), lte: dbDate(to) } } }),
    prisma.appointment.findMany({
      where: {
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        startsAt: { gte: dayStart(from), lt: dayEnd(to) },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      select: { startsAt: true },
    }),
  ]);

  const overrideByDay = new Map(overrides.map((o) => [dbDateToDay(o.date), o]));
  const bookedByDay = new Map();
  for (const a of appointments) {
    const key = dayKey(a.startsAt);
    bookedByDay.set(key, (bookedByDay.get(key) || 0) + 1);
  }

  return eachDay(from, to).map((day) => {
    const override = overrideByDay.get(day);
    const isWorkDay = settings.workDays.includes(isoWeekday(day));
    const max = override ? override.maxVisits : isWorkDay ? settings.defaultVisitsPerDay : 0;
    const booked = bookedByDay.get(day) || 0;
    return { date: day, max, booked, free: Math.max(0, max - booked), isWorkDay, isOverride: Boolean(override), note: override?.note || null };
  });
}

export async function getDayCapacity(day, options) {
  const [capacity] = await getCapacity(day, day, options);
  return capacity;
}

const overrideSchema = z.object({
  maxVisits: z.coerce.number().int().min(0, "Najmenej 0 (deň voľna).").max(50, "Najviac 50."),
  note: optionalText(200),
});

// Výnimka pre konkrétny deň: jarná špička (viac), dovolenka (0).
export async function setDayCapacity(actorId, day, body) {
  if (!isDay(day)) throw badRequest("Neplatný dátum.");
  const data = parse(overrideSchema, body);
  await prisma.dayCapacity.upsert({
    where: { date: dbDate(day) },
    update: data,
    create: { date: dbDate(day), ...data },
  });
  await logAudit({ userId: actorId, action: "DAY_CAPACITY_SET", entityType: "DayCapacity", entityId: day, details: data });
  return getDayCapacity(day);
}

export async function resetDayCapacity(actorId, day) {
  if (!isDay(day)) throw badRequest("Neplatný dátum.");
  await prisma.dayCapacity.deleteMany({ where: { date: dbDate(day) } });
  await logAudit({ userId: actorId, action: "DAY_CAPACITY_RESET", entityType: "DayCapacity", entityId: day });
  return getDayCapacity(day);
}

// Voľné dni pre rezerváciu zo webu (bez osobných údajov), od zajtra.
export async function getPublicAvailability(days = 30) {
  const from = addDays(dayKey(new Date()), 1);
  const to = addDays(from, Math.min(Math.max(days, 1), 60) - 1);
  const capacity = await getCapacity(from, to);
  return capacity.filter((d) => d.free > 0).map((d) => ({ date: d.date, free: d.free }));
}
