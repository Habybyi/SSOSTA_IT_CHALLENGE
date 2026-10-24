import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/httpError.js";
import { parse } from "../../lib/validate.js";
import { generateTempPassword, hashPassword } from "../../lib/password.js";
import { getPagination, paginated } from "../../lib/pagination.js";
import { logAudit } from "../audit/audit.service.js";

const STAFF_ROLES = ["OWNER", "TECHNICIAN"];

const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
};

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email("Zadaj platný e-mail."),
  name: z.string().trim().min(2, "Zadaj meno."),
  phone: z.string().trim().optional().or(z.literal("")),
  role: z.enum(STAFF_ROLES, { message: "Vyber rolu." }),
});

const updateSchema = z.object({
  name: z.string().trim().min(2, "Zadaj meno.").optional(),
  phone: z.string().trim().optional().or(z.literal("")),
  role: z.enum(STAFF_ROLES).optional(),
  isActive: z.boolean().optional(),
});

export async function listStaff(query) {
  const pagination = getPagination(query);
  const where = { role: { in: STAFF_ROLES } };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.user.count({ where }),
  ]);
  return paginated(items, total, pagination);
}

export async function createStaff(actorId, body) {
  const data = parse(createSchema, body);
  const tempPassword = generateTempPassword();
  const user = await prisma.user.create({
    data: {
      ...data,
      phone: data.phone || null,
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
    },
    select: userSelect,
  });
  await logAudit({ userId: actorId, action: "USER_CREATED", entityType: "User", entityId: user.id, details: { role: user.role } });
  return { user, tempPassword };
}

async function ensureNotLastOwner(userId, nextRole, nextActive) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !STAFF_ROLES.includes(user.role)) throw notFound("Používateľ sa nenašiel.");
  const losesOwner = user.role === "OWNER" && (nextRole === "TECHNICIAN" || nextActive === false);
  if (losesOwner) {
    const owners = await prisma.user.count({ where: { role: "OWNER", isActive: true } });
    if (owners <= 1) throw badRequest("Firma musí mať aspoň jedného aktívneho majiteľa.");
  }
}

export async function updateStaff(actorId, userId, body) {
  const data = parse(updateSchema, body);
  await ensureNotLastOwner(userId, data.role, data.isActive);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { ...data, ...(data.phone !== undefined ? { phone: data.phone || null } : {}) },
    select: userSelect,
  });
  await logAudit({ userId: actorId, action: "USER_UPDATED", entityType: "User", entityId: userId, details: data });
  return user;
}

export async function resetPassword(actorId, userId) {
  await ensureNotLastOwner(userId);
  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true },
  });
  await logAudit({ userId: actorId, action: "PASSWORD_RESET", entityType: "User", entityId: userId });
  return { tempPassword };
}
