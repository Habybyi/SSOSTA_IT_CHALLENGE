import { prisma } from "../../lib/prisma.js";
import { getPagination, paginated } from "../../lib/pagination.js";

// Kto čo kedy zmenil. Zápis do auditu nikdy nesmie zhodiť hlavnú akciu.
export async function logAudit({ userId, action, entityType, entityId, details }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entityType, entityId: entityId ? String(entityId) : null, details },
    });
  } catch (err) {
    console.error("Audit log zlyhal:", err);
  }
}

// Posledné záznamy pre stránku Logy (len majiteľ).
export async function listAudit(query) {
  const pagination = getPagination(query);
  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: pagination.skip,
      take: pagination.take,
    }),
    prisma.auditLog.count(),
  ]);
  return paginated(items, total, pagination);
}
