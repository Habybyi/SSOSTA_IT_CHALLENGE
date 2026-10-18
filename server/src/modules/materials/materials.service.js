import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/httpError.js";
import { parse } from "../../lib/validate.js";
import { optionalNumber, optionalText, requiredText } from "../../lib/fields.js";
import { logAudit } from "../audit/audit.service.js";
import { REQUEST_TYPES } from "../requests/requests.service.js";

// Sklad a katalóg materiálu (ceny od veľkoobchodu) + šablóny checklistov podľa typu zásahu.

const materialFields = {
  sku: optionalText(50),
  name: requiredText("Zadaj názov materiálu.", 200),
  unit: optionalText(20),
  unitPrice: optionalNumber({ min: 0, max: 100000 }),
  stockQty: optionalNumber({ min: 0, max: 1000000 }),
  minStock: optionalNumber({ min: 0, max: 1000000 }),
  isActive: z.boolean().optional(),
};

// null z prázdneho poľa nahradíme predvolenou hodnotou, stĺpce v DB sú povinné.
const withDefaults = (data) =>
  Object.fromEntries(
    Object.entries(data).map(([k, v]) => {
      if (v !== null) return [k, v];
      if (k === "unit") return [k, "ks"];
      if (["unitPrice", "stockQty", "minStock"].includes(k)) return [k, 0];
      return [k, v];
    })
  );

const createSchema = z.object(materialFields).transform(withDefaults);
const updateSchema = z.object(materialFields).partial().transform(withDefaults);

const receiveSchema = z.object({
  quantity: optionalNumber({ min: 0.01, max: 100000 }).refine((v) => v, "Zadaj množstvo."),
  note: optionalText(300),
});

const listSchema = z.object({
  q: z.string().trim().optional(),
  lowOnly: z.enum(["true", "false"]).optional(),
  includeInactive: z.enum(["true", "false"]).optional(),
});

const toNumber = (m) => ({
  ...m,
  unitPrice: Number(m.unitPrice),
  stockQty: Number(m.stockQty),
  minStock: Number(m.minStock),
  isLow: Number(m.stockQty) <= Number(m.minStock),
});

export async function listMaterials(query) {
  const { q, lowOnly, includeInactive } = parse(listSchema, query);
  const items = await prisma.material.findMany({
    where: {
      ...(includeInactive === "true" ? {} : { isActive: true }),
      ...(q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { name: "asc" },
  });
  const result = items.map(toNumber);
  return lowOnly === "true" ? result.filter((m) => m.isLow) : result;
}

export async function createMaterial(actorId, body) {
  const data = parse(createSchema, body);
  const material = await prisma.material.create({ data });
  await logAudit({ userId: actorId, action: "MATERIAL_CREATED", entityType: "Material", entityId: material.id });
  return toNumber(material);
}

export async function updateMaterial(actorId, id, body) {
  const data = parse(updateSchema, body);
  const material = await prisma.material.update({ where: { id }, data });
  await logAudit({ userId: actorId, action: "MATERIAL_UPDATED", entityType: "Material", entityId: id, details: data });
  return toNumber(material);
}

// Príjem tovaru (nákup vo veľkoobchode) pripočíta k zásobe.
export async function receiveMaterial(actorId, id, body) {
  const { quantity, note } = parse(receiveSchema, body);
  const material = await prisma.material.update({ where: { id }, data: { stockQty: { increment: quantity } } });
  await logAudit({ userId: actorId, action: "MATERIAL_RECEIVED", entityType: "Material", entityId: id, details: { quantity, note } });
  return toNumber(material);
}

// ---- Šablóny checklistu ----

const templateSchema = z.object({
  requestType: z.enum(REQUEST_TYPES, { message: "Vyber typ zásahu." }),
  materialId: z.uuid("Vyber materiál."),
  quantity: optionalNumber({ min: 0.01, max: 10000 }).refine((v) => v, "Zadaj množstvo."),
  perZone: z.boolean().default(false),
});

export async function listTemplates() {
  const rows = await prisma.materialTemplate.findMany({
    include: { material: { select: { id: true, name: true, unit: true, sku: true } } },
    orderBy: [{ requestType: "asc" }, { material: { name: "asc" } }],
  });
  return rows.map((t) => ({ ...t, quantity: Number(t.quantity) }));
}

export async function upsertTemplate(actorId, body) {
  const data = parse(templateSchema, body);
  const material = await prisma.material.findUnique({ where: { id: data.materialId } });
  if (!material) throw badRequest("Materiál neexistuje.", { fields: { materialId: "Vyber materiál." } });
  const template = await prisma.materialTemplate.upsert({
    where: { requestType_materialId: { requestType: data.requestType, materialId: data.materialId } },
    update: { quantity: data.quantity, perZone: data.perZone },
    create: data,
  });
  await logAudit({ userId: actorId, action: "TEMPLATE_SAVED", entityType: "MaterialTemplate", entityId: template.id, details: data });
  return template;
}

export async function deleteTemplate(actorId, id) {
  const existing = await prisma.materialTemplate.findUnique({ where: { id } });
  if (!existing) throw notFound("Položka checklistu sa nenašla.");
  await prisma.materialTemplate.delete({ where: { id } });
  await logAudit({ userId: actorId, action: "TEMPLATE_DELETED", entityType: "MaterialTemplate", entityId: id });
}

// Checklist pre konkrétnu záhradu: šablóna typu zásahu × počet zón, so stavom skladu.
export async function buildChecklist(requestType, zoneCount) {
  const templates = await prisma.materialTemplate.findMany({
    where: { requestType, material: { isActive: true } },
    include: { material: true },
    orderBy: { material: { name: "asc" } },
  });
  return templates.map((t) => {
    const quantity = Number(t.quantity) * (t.perZone ? Math.max(zoneCount, 1) : 1);
    const stock = Number(t.material.stockQty);
    return {
      materialId: t.materialId,
      name: t.material.name,
      unit: t.material.unit,
      unitPrice: Number(t.material.unitPrice),
      quantity,
      perZone: t.perZone,
      stockQty: stock,
      enoughStock: stock >= quantity,
    };
  });
}
