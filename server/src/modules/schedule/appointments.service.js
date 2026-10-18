import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, conflict, notFound } from "../../lib/httpError.js";
import { parse } from "../../lib/validate.js";
import { optionalText } from "../../lib/fields.js";
import { addMinutes, atTime, dayEnd, dayKey, dayStart, formatDaySk, formatTimeSk, isDay, isTime, timeOf } from "../../lib/dates.js";
import { logAudit } from "../audit/audit.service.js";
import { enqueueNotification } from "../notifications/notifications.service.js";
import { REQUEST_TYPE_LABELS } from "../notifications/labels.js";
import { OPEN_STATUSES } from "../requests/requests.service.js";
import { ACTIVE_APPOINTMENT_STATUSES, getDayCapacity, parseRange } from "./capacity.service.js";
import { getScheduleSettings } from "./settings.service.js";

// Automatická poznámka pri rezervácii zo webu. Po potvrdení času už neplatí, tak sa zmaže.
export const RESERVATION_NOTE = "Rezervácia zo webu, presný čas treba potvrdiť.";
const clearReservationNote = (notes) => (notes === RESERVATION_NOTE ? null : notes);

const appointmentInclude = {
  technician: { select: { id: true, name: true } },
  garden: {
    select: {
      id: true,
      label: true,
      street: true,
      city: true,
      latitude: true,
      longitude: true,
      customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
    },
  },
  serviceRequest: { select: { id: true, number: true, type: true, title: true, priority: true, status: true } },
};

const optionalUuid = z.preprocess((v) => (v === "" ? null : v), z.uuid("Neplatné ID.").nullable().optional());
const dayField = z.string().refine(isDay, "Vyber dátum.");
const timeField = z.string().refine(isTime, "Zadaj čas v tvare HH:MM.");

const createSchema = z.object({
  serviceRequestId: optionalUuid,
  gardenId: optionalUuid,
  technicianId: optionalUuid,
  date: dayField,
  time: timeField,
  durationMin: z.coerce.number().int().min(15).max(720).optional(),
  notes: optionalText(1000),
  notifyCustomer: z.boolean().default(true),
  // true = Milan potvrdil, že chce naplánovať aj napriek plnému dňu alebo obsadenému technikovi.
  force: z.boolean().default(false),
});

const updateSchema = z.object({
  technicianId: optionalUuid,
  date: dayField.optional(),
  time: timeField.optional(),
  durationMin: z.coerce.number().int().min(15).max(720).optional(),
  notes: optionalText(1000),
  routeOrder: z.coerce.number().int().min(0).max(100).nullable().optional(),
  notifyCustomer: z.boolean().default(true),
  force: z.boolean().default(false),
});

const cancelSchema = z.object({ note: optionalText(1000), notifyCustomer: z.boolean().default(true) });

const listSchema = z.object({ technicianId: z.uuid().optional() });

export async function listAppointments(query) {
  const { from, to } = parseRange(query);
  const { technicianId } = parse(listSchema, query);
  return prisma.appointment.findMany({
    where: {
      startsAt: { gte: dayStart(from), lt: dayEnd(to) },
      status: { not: "CANCELLED" },
      ...(technicianId ? { technicianId } : {}),
    },
    include: appointmentInclude,
    orderBy: [{ startsAt: "asc" }, { routeOrder: "asc" }],
  });
}

export async function getAppointment(id) {
  const appointment = await prisma.appointment.findUnique({ where: { id }, include: appointmentInclude });
  if (!appointment) throw notFound("Termín sa nenašiel.");
  return appointment;
}

// Kontroly pred uložením. Bez force vráti 409 s vysvetlením, UI sa opýta "Napriek tomu?".
async function checkConflicts({ startsAt, endsAt, technicianId, excludeId, force }) {
  if (force) return;
  const capacity = await getDayCapacity(dayKey(startsAt), { excludeAppointmentId: excludeId });
  if (capacity.booked >= capacity.max) {
    const day = formatDaySk(startsAt);
    const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
    throw conflict(
      capacity.max === 0
        ? `${dayLabel} je nepracovný deň.`
        : `${dayLabel} je plný (${capacity.booked}/${capacity.max} výjazdov).`,
      { code: "CAPACITY_FULL", capacity }
    );
  }
  if (technicianId) {
    const overlapping = await prisma.appointment.findMany({
      where: {
        technicianId,
        status: { in: ["RESERVED", "CONFIRMED"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      include: { garden: { select: { street: true, city: true } } },
    });
    if (overlapping.length) {
      const first = overlapping[0];
      throw conflict(
        `Technik má v tom čase iný výjazd (${formatTimeSk(first.startsAt)} až ${formatTimeSk(first.endsAt)}, ${first.garden.city}).`,
        { code: "TECHNICIAN_BUSY" }
      );
    }
  }
}

async function notifyAppointment(appointment, template, extra = {}) {
  const customer = appointment.garden.customer;
  if (!customer.email) return;
  await enqueueNotification({
    template,
    recipient: customer.email,
    customerId: customer.id,
    payload: {
      requestId: appointment.serviceRequest?.id,
      appointmentId: appointment.id,
      number: appointment.serviceRequest?.number,
      firstName: customer.firstName,
      typeLabel: appointment.serviceRequest ? REQUEST_TYPE_LABELS[appointment.serviceRequest.type] : "servis",
      dayLabel: formatDaySk(appointment.startsAt),
      timeLabel: formatTimeSk(appointment.startsAt),
      address: `${appointment.garden.street}, ${appointment.garden.city}`,
      ...extra,
    },
  });
}

// Naplánovanie požiadavky posunie jej stav na "Naplánovaná" a nastaví technika.
async function markRequestScheduled(requestId, { technicianId, startsAt, actorId }) {
  const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
  if (!request) return;
  const data = { ...(technicianId ? { assignedToId: technicianId } : {}) };
  const note = `Termín: ${formatDaySk(startsAt)} o ${formatTimeSk(startsAt)}`;
  if (request.status === "NEW") {
    await prisma.$transaction([
      prisma.serviceRequest.update({ where: { id: requestId }, data: { ...data, status: "SCHEDULED" } }),
      prisma.requestStatusChange.create({
        data: { serviceRequestId: requestId, fromStatus: "NEW", toStatus: "SCHEDULED", note, changedById: actorId },
      }),
    ]);
  } else if (Object.keys(data).length) {
    await prisma.serviceRequest.update({ where: { id: requestId }, data });
  }
}

export async function createAppointment(actor, body) {
  const data = parse(createSchema, body);
  const settings = await getScheduleSettings();

  let request = null;
  let gardenId = data.gardenId;
  if (data.serviceRequestId) {
    request = await prisma.serviceRequest.findUnique({ where: { id: data.serviceRequestId } });
    if (!request) throw notFound("Požiadavka sa nenašla.");
    if (!OPEN_STATUSES.includes(request.status)) throw badRequest("Požiadavka je už vybavená alebo zrušená.");
    gardenId = gardenId || request.gardenId;
  }
  if (!gardenId) throw badRequest("Termín potrebuje záhradu. Doplň ju k požiadavke.", { fields: { gardenId: "Vyber záhradu." } });
  const garden = await prisma.garden.findFirst({ where: { id: gardenId, deletedAt: null } });
  if (!garden) throw notFound("Záhrada sa nenašla.");
  if (request && garden.customerId !== request.customerId) throw badRequest("Záhrada nepatrí zákazníkovi požiadavky.");

  const startsAt = atTime(data.date, data.time);
  const duration = data.durationMin || settings.durations[request?.type || "OTHER"];
  const endsAt = addMinutes(startsAt, duration);
  await checkConflicts({ startsAt, endsAt, technicianId: data.technicianId, force: data.force });

  // Ak má požiadavka rezerváciu zo webu, potvrdíme ju namiesto vytvorenia druhého termínu.
  const reserved = request
    ? await prisma.appointment.findFirst({ where: { serviceRequestId: request.id, status: "RESERVED" } })
    : null;
  const appointment = reserved
    ? await prisma.appointment.update({
        where: { id: reserved.id },
        data: {
          startsAt,
          endsAt,
          technicianId: data.technicianId || null,
          notes: data.notes ?? clearReservationNote(reserved.notes),
          status: "CONFIRMED",
        },
        include: appointmentInclude,
      })
    : await prisma.appointment.create({
        data: {
          serviceRequestId: request?.id || null,
          gardenId,
          technicianId: data.technicianId || null,
          startsAt,
          endsAt,
          notes: data.notes,
          status: "CONFIRMED",
        },
        include: appointmentInclude,
      });

  if (request) await markRequestScheduled(request.id, { technicianId: data.technicianId, startsAt, actorId: actor.id });
  if (data.notifyCustomer) await notifyAppointment(appointment, "APPOINTMENT_CONFIRMED");
  await logAudit({ userId: actor.id, action: "APPOINTMENT_CREATED", entityType: "Appointment", entityId: appointment.id });
  return appointment;
}

// Presun termínu, zmena technika alebo potvrdenie rezervácie (RESERVED → CONFIRMED).
export async function updateAppointment(actor, id, body) {
  const data = parse(updateSchema, body);
  const existing = await getAppointment(id);
  if (existing.status === "CANCELLED" || existing.status === "DONE") throw badRequest("Zrušený alebo hotový termín sa nedá meniť.");

  const date = data.date || dayKey(existing.startsAt);
  const time = data.time || timeOf(existing.startsAt);
  const duration = data.durationMin || Math.round((existing.endsAt - existing.startsAt) / 60000);
  const startsAt = atTime(date, time);
  const endsAt = addMinutes(startsAt, duration);
  const technicianId = data.technicianId !== undefined ? data.technicianId : existing.technician?.id || null;

  const timeChanged = startsAt.getTime() !== existing.startsAt.getTime();
  await checkConflicts({ startsAt, endsAt, technicianId, excludeId: id, force: data.force });

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      startsAt,
      endsAt,
      technicianId,
      status: "CONFIRMED",
      notes: data.notes !== undefined ? data.notes : clearReservationNote(existing.notes),
      ...(data.routeOrder !== undefined ? { routeOrder: data.routeOrder } : {}),
    },
    include: appointmentInclude,
  });

  if (existing.serviceRequest) {
    await markRequestScheduled(existing.serviceRequest.id, { technicianId, startsAt, actorId: actor.id });
  }
  const wasReserved = existing.status === "RESERVED";
  if (data.notifyCustomer && (timeChanged || wasReserved)) {
    await notifyAppointment(appointment, wasReserved ? "APPOINTMENT_CONFIRMED" : "APPOINTMENT_RESCHEDULED");
  }
  await logAudit({ userId: actor.id, action: "APPOINTMENT_UPDATED", entityType: "Appointment", entityId: id, details: { date, time, technicianId } });
  return appointment;
}

export async function cancelAppointment(actor, id, body) {
  const { note, notifyCustomer } = parse(cancelSchema, body);
  const existing = await getAppointment(id);
  if (existing.status === "CANCELLED") return existing;
  if (existing.status === "DONE") throw badRequest("Hotový termín sa nedá zrušiť.");

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED", notes: note ? [existing.notes, `Zrušené: ${note}`].filter(Boolean).join("\n") : existing.notes },
    include: appointmentInclude,
  });

  // Ak požiadavka nemá iný termín, vráti sa medzi nové, aby sa na ňu nezabudlo.
  const request = existing.serviceRequest;
  if (request && request.status === "SCHEDULED") {
    const other = await prisma.appointment.count({
      where: { serviceRequestId: request.id, status: { in: ["RESERVED", "CONFIRMED"] } },
    });
    if (other === 0) {
      await prisma.$transaction([
        prisma.serviceRequest.update({ where: { id: request.id }, data: { status: "NEW" } }),
        prisma.requestStatusChange.create({
          data: {
            serviceRequestId: request.id,
            fromStatus: "SCHEDULED",
            toStatus: "NEW",
            note: `Termín ${formatDaySk(existing.startsAt)} zrušený${note ? `: ${note}` : ""}`,
            changedById: actor.id,
          },
        }),
      ]);
    }
  }
  if (notifyCustomer) await notifyAppointment(appointment, "APPOINTMENT_CANCELLED", { reason: note });
  await logAudit({ userId: actor.id, action: "APPOINTMENT_CANCELLED", entityType: "Appointment", entityId: id, details: { note } });
  return appointment;
}

// ---------------------------------------------------------------------------
// Plánovač sezóny: hromadné naplánovanie požiadaviek z jednej obce na jeden deň
// ---------------------------------------------------------------------------

const plannerSchema = z.object({ type: z.enum(["SPRING_START", "WINTERIZATION", "LAWN_CARE", "FAULT", "INSPECTION", "INSTALLATION", "OTHER"]).optional() });

// Nenaplánované požiadavky zoskupené podľa obce, aby jeden výjazd pokryl celú ulicu.
export async function getPlannerGroups(query) {
  const { type } = parse(plannerSchema, query);
  const requests = await prisma.serviceRequest.findMany({
    where: {
      status: { in: ["NEW", "SCHEDULED"] },
      ...(type ? { type } : {}),
      // Naplánované s potvrdeným termínom už netreba, rezervácie áno (čakajú na presný čas).
      NOT: { appointments: { some: { status: "CONFIRMED" } } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      number: true,
      type: true,
      title: true,
      priority: true,
      status: true,
      createdAt: true,
      customer: { select: { id: true, firstName: true, lastName: true } },
      garden: { select: { id: true, street: true, city: true, _count: { select: { zones: true } } } },
      appointments: { where: { status: "RESERVED" }, select: { id: true, startsAt: true } },
    },
  });

  const groups = new Map();
  for (const r of requests) {
    const city = r.garden?.city || "Bez adresy záhrady";
    if (!groups.has(city)) groups.set(city, []);
    groups.get(city).push({ ...r, reservedFor: r.appointments[0] ? dayKey(r.appointments[0].startsAt) : null });
  }
  return [...groups.entries()]
    .map(([city, items]) => ({
      city,
      items: items.sort((a, b) => (a.garden?.street || "").localeCompare(b.garden?.street || "", "sk")),
    }))
    .sort((a, b) => b.items.length - a.items.length || a.city.localeCompare(b.city, "sk"));
}

const planDaySchema = z.object({
  date: dayField,
  technicianId: optionalUuid,
  startTime: timeField.optional(),
  requestIds: z.array(z.uuid()).min(1, "Vyber aspoň jednu požiadavku.").max(30),
  notifyCustomer: z.boolean().default(true),
  force: z.boolean().default(false),
});

// Rozloží vybrané požiadavky za sebou od začiatku dňa, s rezervou na presun.
// Preskočí obsadené časy technika a to, čo sa nezmestí do pracovného dňa alebo kapacity.
export async function planDay(actor, body) {
  const data = parse(planDaySchema, body);
  const settings = await getScheduleSettings();
  const dayEndAt = atTime(data.date, settings.workdayEnd);
  let cursor = atTime(data.date, data.startTime || settings.workdayStart);

  const capacity = await getDayCapacity(data.date);
  let booked = capacity.booked;

  const busy = data.technicianId
    ? await prisma.appointment.findMany({
        where: {
          technicianId: data.technicianId,
          status: { in: ["RESERVED", "CONFIRMED"] },
          startsAt: { lt: dayEnd(data.date) },
          endsAt: { gt: dayStart(data.date) },
        },
        select: { startsAt: true, endsAt: true, serviceRequestId: true },
      })
    : [];

  const requests = await prisma.serviceRequest.findMany({
    where: { id: { in: data.requestIds } },
    include: { garden: true, appointments: { where: { status: "RESERVED" } } },
  });
  const byId = new Map(requests.map((r) => [r.id, r]));

  const planned = [];
  const skipped = [];
  for (const requestId of data.requestIds) {
    const request = byId.get(requestId);
    if (!request) continue;
    if (!OPEN_STATUSES.includes(request.status)) {
      skipped.push({ requestId, number: request.number, reason: "už vybavená alebo zrušená" });
      continue;
    }
    if (!request.garden || request.garden.deletedAt) {
      skipped.push({ requestId, number: request.number, reason: "nemá záhradu" });
      continue;
    }
    const reservation = request.appointments[0];
    // Rezervácia na tento deň už kapacitu zaberá, z iného dňa ju pridáva.
    const addsToDay = !reservation || dayKey(reservation.startsAt) !== data.date;
    if (addsToDay && booked >= capacity.max && !data.force) {
      skipped.push({ requestId, number: request.number, reason: `deň je plný (${booked}/${capacity.max})` });
      continue;
    }

    const duration = settings.durations[request.type] || 60;
    // Posun za obsadené úseky technika (okrem vlastnej rezervácie tejto požiadavky).
    let moved = true;
    while (moved) {
      moved = false;
      for (const b of busy) {
        if (b.serviceRequestId === request.id) continue;
        if (cursor < b.endsAt && addMinutes(cursor, duration) > b.startsAt) {
          cursor = addMinutes(b.endsAt, settings.travelBufferMin);
          moved = true;
        }
      }
    }
    const endsAt = addMinutes(cursor, duration);
    if (endsAt > dayEndAt) {
      skipped.push({ requestId, number: request.number, reason: "nezmestí sa do pracovného dňa" });
      continue;
    }

    const appointment = reservation
      ? await prisma.appointment.update({
          where: { id: reservation.id },
          data: {
            startsAt: cursor,
            endsAt,
            technicianId: data.technicianId || null,
            status: "CONFIRMED",
            routeOrder: planned.length + 1,
            notes: clearReservationNote(reservation.notes),
          },
          include: appointmentInclude,
        })
      : await prisma.appointment.create({
          data: {
            serviceRequestId: request.id,
            gardenId: request.garden.id,
            technicianId: data.technicianId || null,
            startsAt: cursor,
            endsAt,
            status: "CONFIRMED",
            routeOrder: planned.length + 1,
          },
          include: appointmentInclude,
        });
    if (addsToDay) booked += 1;

    await markRequestScheduled(request.id, { technicianId: data.technicianId, startsAt: cursor, actorId: actor.id });
    if (data.notifyCustomer) await notifyAppointment(appointment, "APPOINTMENT_CONFIRMED");
    busy.push({ startsAt: cursor, endsAt, serviceRequestId: request.id });
    planned.push({ requestId, number: request.number, startsAt: cursor, endsAt, appointmentId: appointment.id });
    cursor = addMinutes(endsAt, settings.travelBufferMin);
  }

  await logAudit({
    userId: actor.id,
    action: "DAY_PLANNED",
    entityType: "Appointment",
    entityId: data.date,
    details: { planned: planned.length, skipped: skipped.length, technicianId: data.technicianId },
  });
  return { planned, skipped };
}
