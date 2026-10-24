import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, forbidden, notFound } from "../../lib/httpError.js";
import { parse } from "../../lib/validate.js";
import { getPagination, paginated } from "../../lib/pagination.js";
import { generateTempPassword, hashPassword } from "../../lib/password.js";
import { dayKey, dayStart } from "../../lib/dates.js";
import { logAudit } from "../audit/audit.service.js";
import { createRequestRecord, OPEN_STATUSES } from "../requests/requests.service.js";
import { exportCustomer } from "../customers/gdpr.service.js";
import { deviceSelect, presentDevice } from "../iot/iot.rules.js";


const PORTAL_REQUEST_TYPES = ["FAULT", "SPRING_START", "WINTERIZATION", "LAWN_CARE", "INSPECTION", "INSTALLATION", "OTHER"];

const requestSchema = z.object({
  gardenId: z.preprocess((v) => (v === "" ? undefined : v), z.uuid("Vyber záhradu.").optional()),
  type: z.enum(PORTAL_REQUEST_TYPES, { message: "Vyber, s čím potrebujete pomôcť." }),
  description: z.string().trim().min(5, "Napíšte pár slov, čo sa deje.").max(2000),
  isUrgent: z.boolean().default(false),
});

const preferencesSchema = z.object({
  serviceReminders: z.boolean().optional(),
  marketingConsent: z.boolean().optional(),
});

const portalUserSelect = { id: true, email: true, isActive: true, mustChangePassword: true, createdAt: true };

async function customerOf(user) {
  const customer = user.customerId ? await prisma.customer.findFirst({ where: { id: user.customerId, deletedAt: null } }) : null;
  if (!customer) throw forbidden("Účet nie je prepojený so zákazníkom.");
  return customer;
}

export async function getOverview(user) {
  const customer = await customerOf(user);
  const [gardens, appointments, openRequests] = await prisma.$transaction([
    prisma.garden.findMany({
      where: { customerId: customer.id, deletedAt: null },
      select: {
        id: true,
        label: true,
        street: true,
        city: true,
        installedYear: true,
        isSmartController: true,
        _count: { select: { zones: true } },
        devices: { select: deviceSelect, orderBy: { name: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { garden: { customerId: customer.id }, startsAt: { gte: dayStart(dayKey(new Date())) }, status: { in: ["RESERVED", "CONFIRMED"] } },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        garden: { select: { street: true, city: true } },
        technician: { select: { name: true } },
        serviceRequest: { select: { number: true, type: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    prisma.serviceRequest.count({ where: { customerId: customer.id, status: { in: OPEN_STATUSES } } }),
  ]);
  return {
    customer: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      companyName: customer.companyName,
      email: customer.email,
      phone: customer.phone,
      serviceReminders: customer.serviceReminders,
      marketingConsent: customer.marketingConsent,
    },
    gardens: gardens.map((g) => ({ ...g, devices: g.devices.map(presentDevice) })),
    appointments,
    openRequests,
  };
}

export async function listRequests(user, query) {
  const customer = await customerOf(user);
  const pagination = getPagination(query);
  const where = { customerId: customer.id };
  const [items, total] = await prisma.$transaction([
    prisma.serviceRequest.findMany({
      where,
      select: {
        id: true,
        number: true,
        type: true,
        status: true,
        priority: true,
        title: true,
        createdAt: true,
        garden: { select: { street: true, city: true } },
        appointments: { where: { status: { in: ["RESERVED", "CONFIRMED"] } }, orderBy: { startsAt: "asc" }, take: 1, select: { startsAt: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.serviceRequest.count({ where }),
  ]);
  return paginated(items, total, pagination);
}

export async function createRequest(user, body) {
  const customer = await customerOf(user);
  const data = parse(requestSchema, body);
  const gardens = await prisma.garden.findMany({ where: { customerId: customer.id, deletedAt: null }, select: { id: true } });
  let gardenId = data.gardenId;
  if (gardenId && !gardens.some((g) => g.id === gardenId)) throw badRequest("Táto záhrada nepatrí k vášmu účtu.", { fields: { gardenId: "Vyber záhradu." } });
  if (!gardenId && gardens.length === 1) gardenId = gardens[0].id;

  const request = await createRequestRecord({
    customer,
    gardenId: gardenId || null,
    type: data.type,
    priority: data.isUrgent ? "HIGH" : "NORMAL",
    source: "CUSTOMER_PORTAL",
    description: data.description,
    createdById: user.id,
    notifyCustomer: true,
    notifyStaff: true,
  });
  return { request: { id: request.id, number: request.number } };
}

export async function listHistory(user, query) {
  const customer = await customerOf(user);
  const pagination = getPagination(query);
  const where = { garden: { customerId: customer.id } };
  const [items, total] = await prisma.$transaction([
    prisma.workLog.findMany({
      where,
      select: {
        id: true,
        performedAt: true,
        durationMin: true,
        description: true,
        garden: { select: { street: true, city: true } },
        technician: { select: { name: true } },
      },
      orderBy: { performedAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.workLog.count({ where }),
  ]);
  return paginated(items, total, pagination);
}

export async function updatePreferences(user, body) {
  const customer = await customerOf(user);
  const data = parse(preferencesSchema, body);
  await prisma.customer.update({ where: { id: customer.id }, data });
  await logAudit({ userId: user.id, action: "CUSTOMER_UPDATED", entityType: "Customer", entityId: customer.id, details: data });
  return { ok: true };
}

export async function exportOwnData(user) {
  const customer = await customerOf(user);
  return exportCustomer(user.id, customer.id);
}

export async function getPortalAccount(customerId) {
  return prisma.user.findFirst({ where: { customerId, role: "CUSTOMER" }, select: portalUserSelect });
}

export async function createPortalAccount(actorId, customerId) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null } });
  if (!customer) throw notFound("Zákazník sa nenašiel.");
  if (!customer.email) throw badRequest("Zákazník nemá e-mail. Doplň ho v karte zákazníka, bude to jeho prihlasovacie meno.");
  if (await getPortalAccount(customerId)) throw badRequest("Zákazník už má prístup do portálu.");
  const email = customer.email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) throw badRequest("Tento e-mail už používa iný účet.");

  const tempPassword = generateTempPassword();
  const user = await prisma.user.create({
    data: {
      email,
      name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
      phone: customer.phone,
      role: "CUSTOMER",
      customerId,
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
    },
    select: portalUserSelect,
  });
  await logAudit({ userId: actorId, action: "USER_CREATED", entityType: "User", entityId: user.id, details: { role: "CUSTOMER" } });
  return { account: user, tempPassword };
}

export async function resetPortalPassword(actorId, customerId) {
  const account = await getPortalAccount(customerId);
  if (!account) throw notFound("Zákazník nemá prístup do portálu.");
  const tempPassword = generateTempPassword();
  await prisma.user.update({ where: { id: account.id }, data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true } });
  await logAudit({ userId: actorId, action: "PASSWORD_RESET", entityType: "User", entityId: account.id });
  return { account: await getPortalAccount(customerId), tempPassword };
}

export async function setPortalActive(actorId, customerId, body) {
  const { isActive } = parse(z.object({ isActive: z.boolean() }), body);
  const account = await getPortalAccount(customerId);
  if (!account) throw notFound("Zákazník nemá prístup do portálu.");
  await prisma.user.update({ where: { id: account.id }, data: { isActive } });
  await logAudit({ userId: actorId, action: "USER_UPDATED", entityType: "User", entityId: account.id, details: { isActive } });
  return { account: await getPortalAccount(customerId) };
}
