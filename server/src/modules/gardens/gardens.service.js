import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { notFound } from "../../lib/httpError.js";
import { parse } from "../../lib/validate.js";
import { optionalBoolean, optionalNumber, optionalText, requiredText } from "../../lib/fields.js";
import { logAudit } from "../audit/audit.service.js";

const currentYear = new Date().getFullYear();

const gardenFields = {
  label: optionalText(100),
  street: requiredText("Zadaj ulicu a číslo.", 200),
  city: requiredText("Zadaj obec.", 100),
  postalCode: optionalText(20),
  latitude: optionalNumber({ min: -90, max: 90 }),
  longitude: optionalNumber({ min: -180, max: 180 }),
  areaM2: optionalNumber({ min: 0, max: 1_000_000, int: true }),
  waterSource: z.enum(["MAINS", "WELL", "RAINWATER", "OTHER"]).optional(),
  waterPressureBar: optionalNumber({ min: 0, max: 20 }),
  flowRateLpm: optionalNumber({ min: 0, max: 2000 }),
  mainValveLocation: optionalText(300),
  controllerModel: optionalText(150),
  controllerLocation: optionalText(300),
  isSmartController: optionalBoolean,
  hasRainSensor: optionalBoolean,
  installedYear: optionalNumber({ min: 1990, max: currentYear + 1, int: true }),
  systemVersion: optionalText(100),
  notes: optionalText(5000),
};

// "label" má v DB predvolenú hodnotu, null by ju prepísal.
const dropNullLabel = ({ label, ...rest }) => (label ? { label, ...rest } : rest);

export const gardenCreateSchema = z.object(gardenFields).transform(dropNullLabel);
const gardenUpdateSchema = z.object(gardenFields).partial().transform(dropNullLabel);

const zoneFields = {
  number: optionalNumber({ min: 1, max: 99, int: true }),
  name: optionalText(100),
  areaType: z.enum(["LAWN", "BED", "HEDGE", "OTHER"]).optional(),
  irrigationType: z.enum(["SPRINKLER", "DRIP"]).optional(),
  areaM2: optionalNumber({ min: 0, max: 1_000_000, int: true }),
  sprinklerType: optionalText(150),
  sprinklerBrand: optionalText(100),
  sprinklerCount: optionalNumber({ min: 0, max: 500, int: true }),
  valveType: optionalText(150),
  valveLocation: optionalText(300),
  notes: optionalText(2000),
};
const zoneSchema = z.object(zoneFields);

const workLogSchema = z.object({
  performedAt: z.coerce.date({ message: "Zadaj dátum." }),
  description: requiredText("Popíš, čo sa robilo.", 5000),
  durationMin: optionalNumber({ min: 0, max: 24 * 60, int: true }),
});

async function findGarden(id) {
  const garden = await prisma.garden.findFirst({ where: { id, deletedAt: null, customer: { deletedAt: null } } });
  if (!garden) throw notFound("Záhrada sa nenašla.");
  return garden;
}

// Technická karta: všetko, čo technik potrebuje vedieť pred výjazdom.
export async function getGarden(id) {
  await findGarden(id);
  return prisma.garden.findUnique({
    where: { id },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, companyName: true, phone: true, email: true },
      },
      zones: { orderBy: { number: "asc" } },
      photos: {
        orderBy: { createdAt: "desc" },
        select: { id: true, caption: true, mimeType: true, createdAt: true, uploadedBy: { select: { name: true } } },
      },
      devices: { orderBy: { name: "asc" } },
    },
  });
}

export async function createGarden(actorId, customerId, body) {
  const data = parse(gardenCreateSchema, body);
  const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
  if (!customer) throw notFound("Zákazník sa nenašiel.");
  const garden = await prisma.garden.create({ data: { ...data, customerId } });
  await logAudit({ userId: actorId, action: "GARDEN_CREATED", entityType: "Garden", entityId: garden.id });
  return getGarden(garden.id);
}

export async function updateGarden(actorId, id, body) {
  const data = parse(gardenUpdateSchema, body);
  await findGarden(id);
  await prisma.garden.update({ where: { id }, data });
  await logAudit({ userId: actorId, action: "GARDEN_UPDATED", entityType: "Garden", entityId: id, details: data });
  return getGarden(id);
}

export async function deleteGarden(actorId, id) {
  await findGarden(id);
  await prisma.garden.update({ where: { id }, data: { deletedAt: new Date() } });
  await logAudit({ userId: actorId, action: "GARDEN_DELETED", entityType: "Garden", entityId: id });
}

// ---- Zóny ----

export async function createZone(actorId, gardenId, body) {
  const data = parse(zoneSchema, body);
  await findGarden(gardenId);
  if (!data.number) {
    const last = await prisma.zone.findFirst({ where: { gardenId }, orderBy: { number: "desc" } });
    data.number = (last?.number || 0) + 1;
  }
  const zone = await prisma.zone.create({ data: { ...data, gardenId } });
  await logAudit({ userId: actorId, action: "ZONE_CREATED", entityType: "Zone", entityId: zone.id, details: { gardenId } });
  return zone;
}

async function findZone(gardenId, zoneId) {
  const zone = await prisma.zone.findFirst({ where: { id: zoneId, gardenId } });
  if (!zone) throw notFound("Zóna sa nenašla.");
  return zone;
}

export async function updateZone(actorId, gardenId, zoneId, body) {
  const data = parse(zoneSchema.partial(), body);
  await findGarden(gardenId);
  await findZone(gardenId, zoneId);
  const zone = await prisma.zone.update({ where: { id: zoneId }, data });
  await logAudit({ userId: actorId, action: "ZONE_UPDATED", entityType: "Zone", entityId: zoneId, details: data });
  return zone;
}

export async function deleteZone(actorId, gardenId, zoneId) {
  await findGarden(gardenId);
  await findZone(gardenId, zoneId);
  await prisma.zone.delete({ where: { id: zoneId } });
  await logAudit({ userId: actorId, action: "ZONE_DELETED", entityType: "Zone", entityId: zoneId, details: { gardenId } });
}

// ---- História zásahov ----

// Spojí vykonanú prácu a požiadavky do jednej časovej osi (najnovšie hore).
export async function getHistory(gardenId) {
  await findGarden(gardenId);
  const [workLogs, requests] = await Promise.all([
    prisma.workLog.findMany({
      where: { gardenId },
      orderBy: { performedAt: "desc" },
      include: {
        technician: { select: { name: true } },
        materials: { include: { material: { select: { name: true, unit: true } } } },
      },
    }),
    prisma.serviceRequest.findMany({
      where: { gardenId },
      orderBy: { createdAt: "desc" },
      select: { id: true, number: true, type: true, status: true, priority: true, title: true, createdAt: true },
    }),
  ]);

  const items = [
    ...workLogs.map((w) => ({ kind: "WORK", date: w.performedAt, ...w })),
    ...requests.map((r) => ({ kind: "REQUEST", date: r.createdAt, ...r })),
  ];
  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Ručný záznam do histórie, napr. prepis starých zásahov zo zošita.
export async function addWorkLog(actor, gardenId, body) {
  const data = parse(workLogSchema, body);
  await findGarden(gardenId);
  const workLog = await prisma.workLog.create({
    data: { ...data, gardenId, technicianId: actor.id },
  });
  await logAudit({ userId: actor.id, action: "WORKLOG_CREATED", entityType: "WorkLog", entityId: workLog.id, details: { gardenId } });
  return workLog;
}
