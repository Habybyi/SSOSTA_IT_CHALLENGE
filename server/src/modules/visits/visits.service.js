import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/httpError.js";
import { parse } from "../../lib/validate.js";
import { optionalNumber, optionalText, requiredText } from "../../lib/fields.js";
import { dayKey } from "../../lib/dates.js";
import { logAudit } from "../audit/audit.service.js";
import { enqueueNotification } from "../notifications/notifications.service.js";
import { buildChecklist } from "../materials/materials.service.js";
import { changeStatus } from "../requests/requests.service.js";

export async function getVisit(appointmentId) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      technician: { select: { id: true, name: true } },
      serviceRequest: {
        select: { id: true, number: true, type: true, title: true, description: true, priority: true, status: true },
      },
      garden: {
        include: {
          customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, notes: true } },
          zones: { orderBy: { number: "asc" } },
          photos: { orderBy: { createdAt: "desc" }, select: { id: true, caption: true } },
        },
      },
      workLog: { include: { materials: { include: { material: { select: { name: true, unit: true } } } } } },
    },
  });
  if (!appointment) throw notFound("Výjazd sa nenašiel.");

  const type = appointment.serviceRequest?.type || "OTHER";
  const [checklist, lastWorkLogs] = await Promise.all([
    buildChecklist(type, appointment.garden.zones.length),
    prisma.workLog.findMany({
      where: { gardenId: appointment.gardenId },
      orderBy: { performedAt: "desc" },
      take: 3,
      select: { id: true, performedAt: true, description: true, technician: { select: { name: true } } },
    }),
  ]);
  return { appointment, checklist, lastWorkLogs };
}

const completeSchema = z.object({
  description: requiredText("Napíš, čo sa urobilo.", 5000),
  durationMin: optionalNumber({ min: 0, max: 24 * 60, int: true }),
  materials: z
    .array(
      z.object({
        materialId: z.uuid(),
        quantity: optionalNumber({ min: 0, max: 100000 }),
      })
    )
    .max(100)
    .default([]),
  outcome: z.enum(["DONE", "FOLLOW_UP"]).default("DONE"),
  notifyCustomer: z.boolean().default(true),
});

export async function completeVisit(actor, appointmentId, body) {
  const data = parse(completeSchema, body);
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { serviceRequest: true, workLog: true },
  });
  if (!appointment) throw notFound("Výjazd sa nenašiel.");
  if (appointment.status === "CANCELLED") throw badRequest("Zrušený výjazd sa nedá dokončiť.");
  if (appointment.workLog) throw badRequest("Tento výjazd už je zapísaný.");

  const used = data.materials.filter((m) => m.quantity && m.quantity > 0);
  const materials = await prisma.material.findMany({ where: { id: { in: used.map((m) => m.materialId) } } });
  const byId = new Map(materials.map((m) => [m.id, m]));
  if (byId.size !== new Set(used.map((m) => m.materialId)).size) throw badRequest("Niektorý materiál neexistuje.");

  const workLog = await prisma.$transaction(async (tx) => {
    const log = await tx.workLog.create({
      data: {
        appointmentId,
        serviceRequestId: appointment.serviceRequestId,
        gardenId: appointment.gardenId,
        technicianId: actor.id,
        durationMin: data.durationMin,
        description: data.description,
        materials: {
          create: used.map((m) => ({ materialId: m.materialId, quantity: m.quantity, unitPrice: byId.get(m.materialId).unitPrice })),
        },
      },
      include: { materials: { include: { material: { select: { name: true, unit: true } } } } },
    });
    for (const m of used) {
      await tx.material.update({ where: { id: m.materialId }, data: { stockQty: { decrement: m.quantity } } });
    }
    await tx.appointment.update({ where: { id: appointmentId }, data: { status: "DONE" } });
    return log;
  });

  if (appointment.serviceRequest) {
    const isDone = data.outcome === "DONE";
    await changeStatus(actor, appointment.serviceRequestId, {
      status: isDone ? "DONE" : "IN_PROGRESS",
      note: isDone ? `Výjazd dokončený: ${data.description}` : `Treba ďalší výjazd: ${data.description}`,
      notifyCustomer: isDone && data.notifyCustomer,
    });
  }

  await warnLowStock(used.map((m) => m.materialId));
  await logAudit({
    userId: actor.id,
    action: "VISIT_COMPLETED",
    entityType: "Appointment",
    entityId: appointmentId,
    details: { outcome: data.outcome, materials: used.length },
  });

  const materialCost = workLog.materials.reduce((sum, m) => sum + Number(m.quantity) * Number(m.unitPrice), 0);
  return { workLog, materialCost: Math.round(materialCost * 100) / 100 };
}

async function warnLowStock(materialIds) {
  if (!materialIds.length) return;
  const low = (await prisma.material.findMany({ where: { id: { in: materialIds } } })).filter(
    (m) => Number(m.stockQty) <= Number(m.minStock)
  );
  if (!low.length) return;
  const owners = await prisma.user.findMany({ where: { role: "OWNER", isActive: true }, select: { id: true, email: true } });
  const today = dayKey(new Date());
  for (const m of low) {
    for (const o of owners) {
      await enqueueNotification({
        template: "LOW_STOCK",
        recipient: o.email,
        userId: o.id,
        dedupeKey: `lowstock:${m.id}:${o.id}:${today}`,
        payload: { materialName: m.name, stockQty: Number(m.stockQty), minStock: Number(m.minStock), unit: m.unit },
      });
    }
  }
}
