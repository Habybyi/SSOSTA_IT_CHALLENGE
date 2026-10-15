import { prisma } from "../../lib/prisma.js";

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
