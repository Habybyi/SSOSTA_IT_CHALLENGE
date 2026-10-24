import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/httpError.js";
import { parse } from "../../lib/validate.js";
import { getPagination, paginated } from "../../lib/pagination.js";
import { optionalText } from "../../lib/fields.js";
import { logAudit } from "../audit/audit.service.js";
import { enqueueNotification, listNotificationsForRequest, notifyOwners } from "../notifications/notifications.service.js";
import { PRIORITY_LABELS, REQUEST_TYPE_LABELS, SOURCE_LABELS } from "../notifications/labels.js";

export const REQUEST_TYPES = ["FAULT", "SPRING_START", "WINTERIZATION", "LAWN_CARE", "INSTALLATION", "INSPECTION", "OTHER"];
export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "EMERGENCY"];
const STATUSES = ["NEW", "SCHEDULED", "IN_PROGRESS", "DONE", "CLOSED", "CANCELLED"];
export const OPEN_STATUSES = ["NEW", "SCHEDULED", "IN_PROGRESS"];
const FINISHED_STATUSES = ["DONE", "CLOSED", "CANCELLED"];

const DEFAULT_TITLES = {
  FAULT: "Porucha",
  SPRING_START: "Jarné spustenie",
  WINTERIZATION: "Zazimovanie",
  LAWN_CARE: "Starostlivosť o trávnik",
  INSTALLATION: "Nová inštalácia",
  INSPECTION: "Obhliadka",
  OTHER: "Požiadavka",
};

const optionalUuid = z.preprocess((v) => (v === "" ? null : v), z.uuid("Neplatné ID.").nullable().optional());

const createSchema = z.object({
  customerId: z.uuid("Vyber zákazníka."),
  gardenId: optionalUuid,
  type: z.enum(REQUEST_TYPES, { message: "Vyber typ požiadavky." }),
  priority: z.enum(PRIORITIES).default("NORMAL"),
  source: z.enum(["PHONE", "EMAIL", "MANUAL", "REFERRAL"]).default("PHONE"),
  title: optionalText(200),
  description: optionalText(5000),
  assignedToId: optionalUuid,
  notifyCustomer: z.boolean().default(true),
});

const updateSchema = z.object({
  type: z.enum(REQUEST_TYPES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  title: optionalText(200),
  description: optionalText(5000),
  gardenId: optionalUuid,
  assignedToId: optionalUuid,
});

const statusSchema = z.object({
  status: z.enum(STATUSES, { message: "Neplatný stav." }),
  note: optionalText(2000),
  notifyCustomer: z.boolean().default(true),
});

const listSchema = z.object({
  view: z.enum(["open", "new", "mine", "done", "all"]).default("open"),
  priority: z.enum(PRIORITIES).optional(),
  type: z.enum(REQUEST_TYPES).optional(),
  customerId: z.uuid().optional(),
  q: z.string().trim().optional(),
});

const listSelect = {
  id: true,
  number: true,
  type: true,
  status: true,
  priority: true,
  source: true,
  title: true,
  createdAt: true,
  customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
  garden: { select: { id: true, street: true, city: true } },
  assignedTo: { select: { id: true, name: true } },
  appointments: {
    where: { status: { in: ["RESERVED", "CONFIRMED"] } },
    orderBy: { startsAt: "asc" },
    take: 1,
    select: { startsAt: true, status: true },
  },
};

const customerName = (c) => [c.firstName, c.lastName].filter(Boolean).join(" ");

async function validateRelations({ customerId, gardenId, assignedToId }) {
  if (gardenId) {
    const garden = await prisma.garden.findFirst({ where: { id: gardenId, customerId, deletedAt: null } });
    if (!garden) throw badRequest("Záhrada nepatrí tomuto zákazníkovi.", { fields: { gardenId: "Vyber záhradu zákazníka." } });
  }
  if (assignedToId) {
    const user = await prisma.user.findFirst({
      where: { id: assignedToId, isActive: true, role: { in: ["OWNER", "TECHNICIAN"] } },
    });
    if (!user) throw badRequest("Technik neexistuje alebo nie je aktívny.", { fields: { assignedToId: "Vyber technika." } });
  }
}

export async function createRequestRecord({
  customer,
  gardenId = null,
  type,
  priority = "NORMAL",
  source,
  title,
  description = null,
  payload,
  createdById = null,
  assignedToId = null,
  notifyCustomer = true,
  notifyStaff = false,
}) {
  const request = await prisma.serviceRequest.create({
    data: {
      customerId: customer.id,
      gardenId,
      type,
      priority,
      source,
      title: title || DEFAULT_TITLES[type],
      description,
      payload,
      createdById,
      assignedToId,
      statusChanges: { create: { toStatus: "NEW", changedById: createdById, note: `Prijaté: ${SOURCE_LABELS[source]}` } },
    },
  });

  const base = { requestId: request.id, number: request.number, typeLabel: REQUEST_TYPE_LABELS[type] };
  if (notifyCustomer && customer.email) {
    await enqueueNotification({
      template: "REQUEST_RECEIVED",
      recipient: customer.email,
      customerId: customer.id,
      payload: { ...base, firstName: customer.firstName, description },
    });
  }
  if (notifyStaff) {
    await notifyOwners("STAFF_NEW_REQUEST", {
      ...base,
      customerName: customerName(customer),
      priorityLabel: PRIORITY_LABELS[priority],
      sourceLabel: SOURCE_LABELS[source],
    });
  }
  await logAudit({ userId: createdById, action: "REQUEST_CREATED", entityType: "ServiceRequest", entityId: request.id, details: { source } });
  return request;
}

export async function createRequest(actor, body) {
  const data = parse(createSchema, body);
  const customer = await prisma.customer.findFirst({ where: { id: data.customerId, deletedAt: null } });
  if (!customer) throw badRequest("Zákazník sa nenašiel.", { fields: { customerId: "Vyber zákazníka." } });

  let { gardenId } = data;
  if (!gardenId) {
    const gardens = await prisma.garden.findMany({ where: { customerId: customer.id, deletedAt: null }, select: { id: true } });
    if (gardens.length === 1) gardenId = gardens[0].id;
  }
  await validateRelations({ customerId: customer.id, gardenId, assignedToId: data.assignedToId });

  const request = await createRequestRecord({
    ...data,
    customer,
    gardenId,
    createdById: actor.id,
    notifyStaff: false,
  });
  return getRequest(request.id);
}

export async function listRequests(user, query) {
  const pagination = getPagination(query);
  const { view, priority, type, customerId, q } = parse(listSchema, query);

  const where = {};
  if (view === "open") where.status = { in: OPEN_STATUSES };
  if (view === "new") where.status = "NEW";
  if (view === "done") where.status = { in: FINISHED_STATUSES };
  if (view === "mine") {
    where.assignedToId = user.id;
    where.status = { in: OPEN_STATUSES };
  }
  if (priority) where.priority = priority;
  if (type) where.type = type;
  if (customerId) where.customerId = customerId;
  if (q) {
    const contains = { contains: q, mode: "insensitive" };
    const number = Number(q.replace("#", ""));
    where.OR = [
      { title: contains },
      { description: contains },
      { customer: { OR: [{ firstName: contains }, { lastName: contains }, { phone: contains }] } },
      { garden: { OR: [{ street: contains }, { city: contains }] } },
      ...(Number.isInteger(number) && number > 0 ? [{ number }] : []),
    ];
  }

  const orderBy =
    view === "done" || view === "all" ? [{ createdAt: "desc" }] : [{ priority: "desc" }, { createdAt: "asc" }];

  const [items, total] = await prisma.$transaction([
    prisma.serviceRequest.findMany({ where, select: listSelect, orderBy, skip: pagination.skip, take: pagination.take }),
    prisma.serviceRequest.count({ where }),
  ]);
  return paginated(items, total, pagination);
}

export async function getStats(user) {
  const [newCount, emergency, open, mine] = await prisma.$transaction([
    prisma.serviceRequest.count({ where: { status: "NEW" } }),
    prisma.serviceRequest.count({ where: { status: { in: OPEN_STATUSES }, priority: "EMERGENCY" } }),
    prisma.serviceRequest.count({ where: { status: { in: OPEN_STATUSES } } }),
    prisma.serviceRequest.count({ where: { status: { in: OPEN_STATUSES }, assignedToId: user.id } }),
  ]);
  return { new: newCount, emergency, open, mine };
}

export async function listAssignees() {
  return prisma.user.findMany({
    where: { isActive: true, role: { in: ["OWNER", "TECHNICIAN"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function getRequest(id) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, companyName: true, phone: true, email: true, status: true },
      },
      garden: {
        select: {
          id: true,
          label: true,
          street: true,
          city: true,
          postalCode: true,
          latitude: true,
          longitude: true,
          installedYear: true,
          systemVersion: true,
          _count: { select: { zones: true } },
        },
      },
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      statusChanges: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { name: true } } } },
      appointments: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { startsAt: "asc" },
        include: { technician: { select: { id: true, name: true } } },
      },
    },
  });
  if (!request) throw notFound("Požiadavka sa nenašla.");
  const notifications = await listNotificationsForRequest(id);
  return { ...request, notifications };
}

export async function updateRequest(actor, id, body) {
  const data = parse(updateSchema, body);
  const existing = await prisma.serviceRequest.findUnique({ where: { id } });
  if (!existing) throw notFound("Požiadavka sa nenašla.");
  await validateRelations({ customerId: existing.customerId, gardenId: data.gardenId, assignedToId: data.assignedToId });

  if (data.title === null) data.title = DEFAULT_TITLES[data.type || existing.type];

  await prisma.serviceRequest.update({ where: { id }, data });
  await logAudit({ userId: actor.id, action: "REQUEST_UPDATED", entityType: "ServiceRequest", entityId: id, details: data });
  return getRequest(id);
}

export async function changeStatus(actor, id, body) {
  const { status, note, notifyCustomer } = parse(statusSchema, body);
  const existing = await prisma.serviceRequest.findUnique({ where: { id }, include: { customer: true } });
  if (!existing) throw notFound("Požiadavka sa nenašla.");
  if (existing.status === status && !note) return getRequest(id);

  await prisma.$transaction([
    prisma.serviceRequest.update({
      where: { id },
      data: { status, closedAt: FINISHED_STATUSES.includes(status) ? existing.closedAt || new Date() : null },
    }),
    prisma.requestStatusChange.create({
      data: { serviceRequestId: id, fromStatus: existing.status, toStatus: status, note, changedById: actor.id },
    }),
  ]);

  if (status === "DONE" && existing.status !== "DONE" && notifyCustomer && existing.customer.email) {
    await enqueueNotification({
      template: "REQUEST_DONE",
      recipient: existing.customer.email,
      customerId: existing.customerId,
      payload: {
        requestId: id,
        number: existing.number,
        firstName: existing.customer.firstName,
        typeLabel: REQUEST_TYPE_LABELS[existing.type],
      },
    });
  }
  await logAudit({
    userId: actor.id,
    action: "REQUEST_STATUS_CHANGED",
    entityType: "ServiceRequest",
    entityId: id,
    details: { from: existing.status, to: status },
  });
  return getRequest(id);
}
