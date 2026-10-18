import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest } from "../../lib/httpError.js";
import { parse } from "../../lib/validate.js";
import { addDays, dayEnd, dayKey, dayStart, formatDaySk, formatTimeSk } from "../../lib/dates.js";
import { logAudit } from "../audit/audit.service.js";
import { enqueueNotification } from "../notifications/notifications.service.js";
import { REQUEST_TYPE_LABELS } from "../notifications/labels.js";
import { OPEN_STATUSES } from "../requests/requests.service.js";

// Pripomienky: deň pred termínom a sezónne kampane (jarné spustenie, zazimovanie).

export const SEASONAL_TYPES = ["WINTERIZATION", "SPRING_START"];

export const DEFAULT_REMINDERS = {
  dayBeforeHour: 17, // od tejto hodiny sa posielajú pripomienky na zajtra
  seasonal: {
    WINTERIZATION: { enabled: true, month: 9, day: 15 },
    SPRING_START: { enabled: true, month: 3, day: 1 },
  },
};

export async function getReminderSettings() {
  const row = await prisma.setting.findUnique({ where: { key: "reminders" } });
  const stored = row?.value || {};
  return {
    ...DEFAULT_REMINDERS,
    ...stored,
    seasonal: {
      WINTERIZATION: { ...DEFAULT_REMINDERS.seasonal.WINTERIZATION, ...(stored.seasonal?.WINTERIZATION || {}) },
      SPRING_START: { ...DEFAULT_REMINDERS.seasonal.SPRING_START, ...(stored.seasonal?.SPRING_START || {}) },
    },
  };
}

const seasonSchema = z.object({
  enabled: z.boolean(),
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(28, "Vyber deň 1 až 28 (platí pre každý mesiac)."),
});

const settingsSchema = z.object({
  dayBeforeHour: z.coerce.number().int().min(6, "Najskôr o 6:00.").max(22, "Najneskôr o 22:00.").optional(),
  seasonal: z.object({ WINTERIZATION: seasonSchema.optional(), SPRING_START: seasonSchema.optional() }).optional(),
});

export async function updateReminderSettings(actorId, body) {
  const data = parse(settingsSchema, body);
  const current = await getReminderSettings();
  const next = {
    ...current,
    ...(data.dayBeforeHour !== undefined ? { dayBeforeHour: data.dayBeforeHour } : {}),
    seasonal: { ...current.seasonal, ...(data.seasonal || {}) },
  };
  await prisma.setting.upsert({ where: { key: "reminders" }, update: { value: next }, create: { key: "reminders", value: next } });
  await logAudit({ userId: actorId, action: "REMINDER_SETTINGS_UPDATED", entityType: "Setting", entityId: "reminders", details: data });
  return next;
}

// ---- Sezónne kampane ----

const seasonKey = (type, year) => `reminders.lastRun.${type}.${year}`;

// Od kedy sa ráta sezóna: zazimovanie od 1. júla, jarné spustenie od 1. januára.
const seasonStart = (type, year) => (type === "WINTERIZATION" ? new Date(year, 6, 1) : new Date(year, 0, 1));

// Komu by išla pripomienka: aktívni zákazníci so záhradou a e-mailom, ktorí sa neodhlásili,
// nemajú otvorenú požiadavku toho typu, túto sezónu ho ešte nemali a pripomienku ešte nedostali.
export async function getSeasonalRecipients(type) {
  const year = new Date().getFullYear();
  const customers = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      serviceReminders: true,
      email: { not: null },
      gardens: { some: { deletedAt: null } },
      serviceRequests: {
        none: {
          type,
          OR: [
            { status: { in: OPEN_STATUSES } },
            { status: { not: "CANCELLED" }, createdAt: { gte: seasonStart(type, year) } },
          ],
        },
      },
    },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const sent = await prisma.notification.findMany({
    where: { dedupeKey: { in: customers.map((c) => `season:${type}:${year}:${c.id}`) } },
    select: { customerId: true },
  });
  const sentIds = new Set(sent.map((n) => n.customerId));
  return customers.filter((c) => !sentIds.has(c.id));
}

export async function getSeasonalOverview() {
  const year = new Date().getFullYear();
  const settings = await getReminderSettings();
  const rows = await prisma.setting.findMany({ where: { key: { in: SEASONAL_TYPES.map((t) => seasonKey(t, year)) } } });
  const lastRun = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Promise.all(
    SEASONAL_TYPES.map(async (type) => ({
      type,
      ...settings.seasonal[type],
      lastRun: lastRun[seasonKey(type, year)] || null,
      recipients: (await getSeasonalRecipients(type)).length,
    }))
  );
}

export async function runSeasonalCampaign(actorId, type) {
  if (!SEASONAL_TYPES.includes(type)) throw badRequest("Neznámy typ kampane.");
  const year = new Date().getFullYear();
  const recipients = await getSeasonalRecipients(type);
  let queued = 0;
  for (const c of recipients) {
    const n = await enqueueNotification({
      template: "SEASONAL_REMINDER",
      recipient: c.email,
      customerId: c.id,
      dedupeKey: `season:${type}:${year}:${c.id}`,
      payload: { type, typeLabel: REQUEST_TYPE_LABELS[type], firstName: c.firstName },
    });
    if (n) queued += 1;
  }
  const key = seasonKey(type, year);
  const previous = (await prisma.setting.findUnique({ where: { key } }))?.value;
  await prisma.setting.upsert({
    where: { key },
    update: { value: { at: new Date().toISOString(), count: (previous?.count || 0) + queued } },
    create: { key, value: { at: new Date().toISOString(), count: queued } },
  });
  await logAudit({ userId: actorId, action: "SEASONAL_CAMPAIGN_RUN", entityType: "Setting", entityId: key, details: { queued } });
  return { queued };
}

// ---- Deň pred termínom ----

// Zákazník dostane pripomienku, technik zoznam zajtrajších výjazdov.
// dedupeKey obsahuje čas termínu: po presune príde nová pripomienka, inak nikdy dvakrát.
export async function queueTomorrowReminders() {
  const tomorrow = addDays(dayKey(new Date()), 1);
  const appointments = await prisma.appointment.findMany({
    where: { status: "CONFIRMED", startsAt: { gte: dayStart(tomorrow), lt: dayEnd(tomorrow) } },
    orderBy: { startsAt: "asc" },
    include: {
      technician: { select: { id: true, name: true, email: true } },
      serviceRequest: { select: { number: true, type: true } },
      garden: {
        select: {
          street: true,
          city: true,
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, serviceReminders: true } },
        },
      },
    },
  });

  let customers = 0;
  for (const a of appointments) {
    const c = a.garden.customer;
    if (!c.email || !c.serviceReminders) continue;
    const n = await enqueueNotification({
      template: "APPOINTMENT_REMINDER",
      recipient: c.email,
      customerId: c.id,
      dedupeKey: `remind:${a.id}:${a.startsAt.toISOString()}`,
      payload: {
        appointmentId: a.id,
        firstName: c.firstName,
        typeLabel: a.serviceRequest ? REQUEST_TYPE_LABELS[a.serviceRequest.type] : "servis",
        dayLabel: formatDaySk(a.startsAt),
        timeLabel: formatTimeSk(a.startsAt),
        address: `${a.garden.street}, ${a.garden.city}`,
      },
    });
    if (n) customers += 1;
  }

  const byTech = new Map();
  for (const a of appointments) {
    if (!a.technician?.email) continue;
    if (!byTech.has(a.technician.id)) byTech.set(a.technician.id, { technician: a.technician, items: [] });
    byTech.get(a.technician.id).items.push({
      time: formatTimeSk(a.startsAt),
      customer: `${a.garden.customer.firstName} ${a.garden.customer.lastName}`,
      phone: a.garden.customer.phone,
      address: `${a.garden.street}, ${a.garden.city}`,
      typeLabel: a.serviceRequest ? REQUEST_TYPE_LABELS[a.serviceRequest.type] : "servis",
      appointmentId: a.id,
    });
  }
  let technicians = 0;
  for (const { technician, items } of byTech.values()) {
    const n = await enqueueNotification({
      template: "TECH_AGENDA",
      recipient: technician.email,
      userId: technician.id,
      dedupeKey: `agenda:${technician.id}:${tomorrow}:${items.map((i) => i.appointmentId + i.time).join(",")}`,
      payload: { name: technician.name.split(" ")[0], dayLabel: formatDaySk(dayStart(tomorrow)), items },
    });
    if (n) technicians += 1;
  }
  return { customers, technicians };
}

// ---- Plánovač úloh (volá sa každých pár minút) ----

export async function runDueReminderJobs(now = new Date()) {
  const settings = await getReminderSettings();
  const result = {};

  if (now.getHours() >= settings.dayBeforeHour) {
    result.tomorrow = await queueTomorrowReminders();
  }

  // Sezónna kampaň sa spustí sama v nastavený deň (a v nasledujúcich 30 dňoch, ak server nebežal).
  const year = now.getFullYear();
  for (const type of SEASONAL_TYPES) {
    const season = settings.seasonal[type];
    if (!season.enabled) continue;
    const start = new Date(year, season.month - 1, season.day);
    const end = new Date(year, season.month - 1, season.day + 30);
    if (now < start || now > end) continue;
    const alreadyRun = await prisma.setting.findUnique({ where: { key: seasonKey(type, year) } });
    if (!alreadyRun) result[type] = await runSeasonalCampaign(null, type);
  }
  return result;
}

export function startReminderScheduler() {
  const tick = () => runDueReminderJobs().catch((err) => console.error("Plánovač pripomienok zlyhal:", err.message));
  tick();
  return setInterval(tick, 5 * 60 * 1000);
}
