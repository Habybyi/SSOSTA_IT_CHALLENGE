import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { deviceSelect } from "../iot/iot.rules.js";
import { notFound } from "../../lib/httpError.js";
import { storage } from "../../lib/storage.js";
import { logAudit } from "../audit/audit.service.js";


export async function exportCustomer(actorId, id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      gardens: { include: { zones: true, photos: { select: { id: true, caption: true, createdAt: true } }, devices: { select: deviceSelect } } },
      serviceRequests: {
        include: { statusChanges: true, appointments: true, workLogs: { include: { materials: { include: { material: true } } } } },
      },
      notifications: { select: { template: true, recipient: true, status: true, sentAt: true, createdAt: true } },
      user: { select: { email: true, name: true, createdAt: true } },
    },
  });
  if (!customer) throw notFound("Zákazník sa nenašiel.");
  await logAudit({ userId: actorId, action: "CUSTOMER_EXPORTED", entityType: "Customer", entityId: id });
  return {
    exportedAt: new Date().toISOString(),
    note: "Export osobných údajov podľa čl. 15 a 20 GDPR. Custodia, Ul. 29. augusta 4812, 058 01 Poprad.",
    customer,
  };
}

export async function anonymizeCustomer(actorId, id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { gardens: { include: { photos: true } }, user: true },
  });
  if (!customer) throw notFound("Zákazník sa nenašiel.");

  const photoKeys = customer.gardens.flatMap((g) => g.photos.map((p) => p.storageKey));

  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id },
      data: {
        firstName: "Anonymizovaný",
        lastName: "zákazník",
        companyName: null,
        email: null,
        phone: null,
        phoneNormalized: null,
        billingStreet: null,
        billingCity: null,
        billingPostalCode: null,
        notes: null,
        marketingConsent: false,
        serviceReminders: false,
        status: "INACTIVE",
        deletedAt: customer.deletedAt || new Date(),
      },
    });
    await tx.garden.updateMany({
      where: { customerId: id },
      data: { street: "anonymizované", postalCode: null, latitude: null, longitude: null, notes: null, deletedAt: new Date() },
    });
    await tx.photo.deleteMany({ where: { garden: { customerId: id } } });
    await tx.serviceRequest.updateMany({ where: { customerId: id }, data: { description: null } });
    await tx.notification.updateMany({ where: { customerId: id, status: "PENDING" }, data: { status: "CANCELLED" } });
    await tx.notification.updateMany({ where: { customerId: id }, data: { recipient: "anonymizované", payload: Prisma.DbNull } });
    await tx.auditLog.updateMany({ where: { entityType: "Customer", entityId: id }, data: { details: Prisma.DbNull } });
    if (customer.user) {
      const userId = customer.user.id;
      await tx.auditLog.updateMany({ where: { userId }, data: { userId: null } });
      await tx.serviceRequest.updateMany({ where: { createdById: userId }, data: { createdById: null } });
      await tx.requestStatusChange.updateMany({ where: { changedById: userId }, data: { changedById: null } });
      await tx.photo.updateMany({ where: { uploadedById: userId }, data: { uploadedById: null } });
      await tx.notification.updateMany({ where: { userId }, data: { userId: null } });
      await tx.user.delete({ where: { id: userId } });
    }
  });

  for (const key of photoKeys) await storage.remove(key).catch(() => {});
  await logAudit({ userId: actorId, action: "CUSTOMER_ANONYMIZED", entityType: "Customer", entityId: id });
  return { ok: true };
}
