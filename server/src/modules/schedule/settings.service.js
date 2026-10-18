import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { parse } from "../../lib/validate.js";
import { isTime } from "../../lib/dates.js";
import { logAudit } from "../audit/audit.service.js";

// Nastavenia plánovania v jednom zázname tabuľky Setting (kľúč "schedule").
export const DEFAULT_SCHEDULE = {
  workdayStart: "08:00",
  workdayEnd: "17:00",
  workDays: [1, 2, 3, 4, 5, 6], // pondelok až sobota
  defaultVisitsPerDay: 6,
  travelBufferMin: 15, // presun medzi záhradami
  // Koľko trvá zásah podľa typu (minúty).
  durations: {
    FAULT: 90,
    SPRING_START: 60,
    WINTERIZATION: 60,
    LAWN_CARE: 120,
    INSTALLATION: 480,
    INSPECTION: 60,
    OTHER: 60,
  },
};

const timeField = z.string().refine(isTime, "Zadaj čas v tvare HH:MM.");
const minutes = z.coerce.number().int().min(15, "Najmenej 15 minút.").max(720, "Najviac 12 hodín.");

const scheduleSchema = z
  .object({
    workdayStart: timeField,
    workdayEnd: timeField,
    workDays: z.array(z.number().int().min(1).max(7)).min(1, "Vyber aspoň jeden pracovný deň."),
    defaultVisitsPerDay: z.coerce.number().int().min(1, "Aspoň 1 výjazd.").max(50),
    travelBufferMin: z.coerce.number().int().min(0).max(180),
    durations: z.object(Object.fromEntries(Object.keys(DEFAULT_SCHEDULE.durations).map((k) => [k, minutes]))),
  })
  .partial()
  .refine((s) => !s.workdayStart || !s.workdayEnd || s.workdayStart < s.workdayEnd, {
    message: "Koniec dňa musí byť po začiatku.",
    path: ["workdayEnd"],
  });

export async function getScheduleSettings() {
  const row = await prisma.setting.findUnique({ where: { key: "schedule" } });
  const stored = row?.value || {};
  return { ...DEFAULT_SCHEDULE, ...stored, durations: { ...DEFAULT_SCHEDULE.durations, ...(stored.durations || {}) } };
}

export async function updateScheduleSettings(actorId, body) {
  const data = parse(scheduleSchema, body);
  const current = await getScheduleSettings();
  const next = { ...current, ...data, durations: { ...current.durations, ...(data.durations || {}) } };
  if (next.workdayStart >= next.workdayEnd) {
    parse(scheduleSchema, { workdayStart: next.workdayStart, workdayEnd: next.workdayEnd });
  }
  await prisma.setting.upsert({ where: { key: "schedule" }, update: { value: next }, create: { key: "schedule", value: next } });
  await logAudit({ userId: actorId, action: "SCHEDULE_SETTINGS_UPDATED", entityType: "Setting", entityId: "schedule", details: data });
  return next;
}
