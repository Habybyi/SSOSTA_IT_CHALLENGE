import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { notFound, unauthorized } from "../../lib/httpError.js";
import { parse } from "../../lib/validate.js";
import { logAudit } from "../audit/audit.service.js";
import { createRequestRecord } from "../requests/requests.service.js";
import { createsRequest, deviceSelect, deviceStatus, formatValue, presentDevice } from "./iot.rules.js";

const DEVICE_TYPES = ["HOME_GATEWAY", "SPRINKLER", "HUMIDITY_SENSOR", "WATER_LEVEL_SENSOR", "TRIP_SENSOR", "MOWER", "OTHER"];
const OPEN_STATUSES = ["NEW", "SCHEDULED", "IN_PROGRESS"];
const HISTORY_HOURS = 24;

const createSchema = z.object({
  name: z.string().trim().min(2, "Zadaj názov zariadenia."),
  type: z.enum(DEVICE_TYPES, { message: "Vyber typ zariadenia." }),
  externalId: z.string().trim().max(100).optional().or(z.literal("")),
});

const readingSchema = z.object({
  value: z.coerce.number({ message: "Hodnota musí byť číslo." }).finite().min(-1e6).max(1e6),
  recordedAt: z.coerce.date().optional(),
});

// Kľúč vidí majiteľ iba raz (ako dočasné heslo), v databáze je len jeho hash.
const newToken = () => crypto.randomBytes(24).toString("base64url");
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export async function listGardenDevices(gardenId) {
  const since = new Date(Date.now() - HISTORY_HOURS * 3600 * 1000);
  const devices = await prisma.device.findMany({
    where: { gardenId },
    select: {
      ...deviceSelect,
      readings: { where: { recordedAt: { gte: since } }, orderBy: { recordedAt: "asc" }, select: { value: true, recordedAt: true } },
    },
    orderBy: { name: "asc" },
  });
  return devices.map(presentDevice);
}

export async function createDevice(actorId, gardenId, body) {
  const data = parse(createSchema, body);
  const garden = await prisma.garden.findFirst({ where: { id: gardenId, deletedAt: null } });
  if (!garden) throw notFound("Záhrada sa nenašla.");
  const token = newToken();
  const device = await prisma.device.create({
    data: { gardenId, name: data.name, type: data.type, externalId: data.externalId || null, tokenHash: hashToken(token) },
    select: deviceSelect,
  });
  await logAudit({ userId: actorId, action: "DEVICE_CREATED", entityType: "Device", entityId: device.id, details: { name: device.name } });
  return { device: presentDevice(device), token };
}

export async function regenerateToken(actorId, id) {
  const token = newToken();
  const device = await prisma.device.update({ where: { id }, data: { tokenHash: hashToken(token) }, select: deviceSelect }).catch(() => null);
  if (!device) throw notFound("Zariadenie sa nenašlo.");
  await logAudit({ userId: actorId, action: "DEVICE_TOKEN_REGENERATED", entityType: "Device", entityId: id });
  return { device: presentDevice(device), token };
}

export async function deleteDevice(actorId, id) {
  const device = await prisma.device.delete({ where: { id }, select: deviceSelect }).catch(() => null);
  if (!device) throw notFound("Zariadenie sa nenašlo.");
  await logAudit({ userId: actorId, action: "DEVICE_DELETED", entityType: "Device", entityId: id, details: { name: device.name } });
}

// Príjem hodnoty zo senzora (Packet Tracer, ESP32, simulátor...).
export async function receiveReading(token, body) {
  if (!token) throw unauthorized("Chýba kľúč zariadenia (hlavička X-Device-Token).");
  const device = await prisma.device.findUnique({
    where: { tokenHash: hashToken(String(token)) },
    include: { garden: { include: { customer: true } } },
  });
  if (!device) throw unauthorized("Neznámy kľúč zariadenia.");

  const { value, recordedAt } = parse(readingSchema, body);
  // Hodinky zariadenia môžu ísť zle: budúcnosť ani staré dáta neberieme.
  const now = new Date();
  const at = recordedAt && recordedAt <= now && now - recordedAt < 24 * 3600 * 1000 ? recordedAt : now;

  await prisma.$transaction([
    prisma.deviceReading.create({ data: { deviceId: device.id, value, recordedAt: at } }),
    prisma.device.update({ where: { id: device.id }, data: { lastValue: { value }, lastSeenAt: at } }),
  ]);

  const request = createsRequest(device.type, value) ? await openLeakRequest(device, value) : null;
  return {
    ok: true,
    device: device.name,
    display: formatValue(device.type, value),
    status: deviceStatus({ ...device, lastValue: { value }, lastSeenAt: at }).level,
    requestNumber: request?.number ?? null,
  };
}

// Jedna otvorená požiadavka na únik, nie nová pri každej správe senzora.
async function openLeakRequest(device, value) {
  const { garden } = device;
  if (garden.deletedAt || garden.customer.deletedAt) return null;
  const existing = await prisma.serviceRequest.findFirst({
    where: { gardenId: garden.id, source: "IOT", status: { in: OPEN_STATUSES }, payload: { path: ["deviceId"], equals: device.id } },
  });
  if (existing) return existing;
  return createRequestRecord({
    customer: garden.customer,
    gardenId: garden.id,
    type: "FAULT",
    priority: "HIGH",
    source: "IOT",
    title: `Senzor hlási únik vody (${device.name})`,
    description: `Zariadenie „${device.name}“ v záhrade ${garden.street}, ${garden.city} nahlásilo únik vody. Požiadavka vznikla automaticky.`,
    payload: { deviceId: device.id, value },
    notifyCustomer: false,
    notifyStaff: true,
  });
}
