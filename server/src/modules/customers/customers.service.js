import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/httpError.js";
import { parse } from "../../lib/validate.js";
import { getPagination, paginated } from "../../lib/pagination.js";
import { optionalBoolean, optionalEmail, optionalText, requiredText } from "../../lib/fields.js";
import { normalizePhone } from "../../lib/phone.js";
import { logAudit } from "../audit/audit.service.js";
import { gardenCreateSchema } from "../gardens/gardens.service.js";

const OPEN_STATUSES = ["NEW", "SCHEDULED", "IN_PROGRESS"];

const customerFields = {
  firstName: requiredText("Zadaj meno.", 100),
  lastName: requiredText("Zadaj priezvisko.", 100),
  companyName: optionalText(200),
  email: optionalEmail,
  phone: optionalText(40),
  preferredContact: z.enum(["PHONE", "EMAIL", "SMS"]).optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  source: z.enum(["WEB_FORM", "CALCULATOR", "EMAIL", "PHONE", "REFERRAL", "CUSTOMER_PORTAL", "MANUAL"]).optional(),
  billingStreet: optionalText(200),
  billingCity: optionalText(100),
  billingPostalCode: optionalText(20),
  notes: optionalText(5000),
  marketingConsent: optionalBoolean,
  serviceReminders: optionalBoolean,
};

const needsContact = (data) => Boolean(data.phone || data.email);
// Zod si objekt s parametrami upravuje, preto správa ako samostatná konštanta.
const CONTACT_MESSAGE = "Zadaj aspoň telefón alebo e-mail.";

const createSchema = z
  .object({ ...customerFields, garden: gardenCreateSchema.optional() })
  .refine(needsContact, { message: CONTACT_MESSAGE, path: ["phone"] });

const updateSchema = z.object(customerFields).partial();

const listSchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  city: z.string().trim().optional(),
});

const listInclude = {
  gardens: {
    where: { deletedAt: null },
    select: { id: true, label: true, street: true, city: true },
    orderBy: { createdAt: "asc" },
  },
  _count: { select: { serviceRequests: { where: { status: { in: OPEN_STATUSES } } } } },
};

const withOpenCount = ({ _count, ...customer }) => ({ ...customer, openRequests: _count.serviceRequests });

export async function listCustomers(query) {
  const pagination = getPagination(query);
  const { q, status, city } = parse(listSchema, query);

  const where = { deletedAt: null, ...(status ? { status } : {}) };
  const and = [];
  if (q) {
    // Hľadanie naprieč menom, kontaktom aj adresou záhrady.
    const words = q.split(/\s+/).filter(Boolean);
    for (const word of words) {
      const contains = { contains: word, mode: "insensitive" };
      and.push({
        OR: [
          { firstName: contains },
          { lastName: contains },
          { companyName: contains },
          { email: contains },
          { phone: { contains: word } },
          ...(/\d{3,}/.test(word) ? [{ phoneNormalized: { contains: normalizePhone(word).replace(/^421/, "") } }] : []),
          { gardens: { some: { deletedAt: null, OR: [{ street: contains }, { city: contains }] } } },
        ],
      });
    }
  }
  if (city) {
    and.push({ gardens: { some: { deletedAt: null, city: { equals: city, mode: "insensitive" } } } });
  }
  if (and.length) where.AND = and;

  const [items, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      include: listInclude,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.customer.count({ where }),
  ]);
  return paginated(items.map(withOpenCount), total, pagination);
}

// Zoznam obcí pre filter (z adries záhrad).
export async function listCities() {
  const rows = await prisma.garden.findMany({
    where: { deletedAt: null, customer: { deletedAt: null } },
    distinct: ["city"],
    select: { city: true },
    orderBy: { city: "asc" },
  });
  return rows.map((r) => r.city);
}

export async function getCustomer(id) {
  const customer = await prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      gardens: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { zones: true, photos: true } } },
      },
      serviceRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, number: true, type: true, status: true, priority: true, title: true, createdAt: true },
      },
    },
  });
  if (!customer) throw notFound("Zákazník sa nenašiel.");
  return customer;
}

export async function createCustomer(actorId, body) {
  const { garden, ...data } = parse(createSchema, body);
  const customer = await prisma.customer.create({
    data: {
      ...data,
      phoneNormalized: normalizePhone(data.phone),
      ...(garden ? { gardens: { create: garden } } : {}),
    },
  });
  await logAudit({ userId: actorId, action: "CUSTOMER_CREATED", entityType: "Customer", entityId: customer.id });
  return getCustomer(customer.id);
}

export async function updateCustomer(actorId, id, body) {
  const data = parse(updateSchema, body);
  const existing = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound("Zákazník sa nenašiel.");

  if (!needsContact({ ...existing, ...data })) {
    throw badRequest("Skontroluj vyplnené údaje.", { fields: { phone: CONTACT_MESSAGE } });
  }

  await prisma.customer.update({
    where: { id },
    data: { ...data, ...(data.phone !== undefined ? { phoneNormalized: normalizePhone(data.phone) } : {}) },
  });
  await logAudit({ userId: actorId, action: "CUSTOMER_UPDATED", entityType: "Customer", entityId: id, details: data });
  return getCustomer(id);
}

// Soft delete: zákazník zmizne zo zoznamov, ale história ostáva dohľadateľná.
export async function deleteCustomer(actorId, id) {
  const existing = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw notFound("Zákazník sa nenašiel.");
  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), status: "INACTIVE" } });
  await logAudit({ userId: actorId, action: "CUSTOMER_DELETED", entityType: "Customer", entityId: id });
}
