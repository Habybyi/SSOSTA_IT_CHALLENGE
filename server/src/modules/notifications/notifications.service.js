import { prisma } from "../../lib/prisma.js";

export async function enqueueNotification({
  template,
  recipient,
  payload,
  customerId,
  userId,
  channel = "EMAIL",
  scheduledFor,
  dedupeKey,
}) {
  if (!recipient) return null;
  try {
    return await prisma.notification.create({
      data: { template, recipient, payload, customerId, userId, channel, scheduledFor, dedupeKey },
    });
  } catch (err) {
    if (err.code === "P2002") return null;
    throw err;
  }
}

export async function notifyOwners(template, payload) {
  const owners = await prisma.user.findMany({ where: { role: "OWNER", isActive: true }, select: { id: true, email: true } });
  await Promise.all(owners.map((o) => enqueueNotification({ template, recipient: o.email, payload, userId: o.id })));
}

export async function listNotificationsForRequest(requestId) {
  return prisma.notification.findMany({
    where: { payload: { path: ["requestId"], equals: requestId } },
    orderBy: { createdAt: "asc" },
    select: { id: true, template: true, recipient: true, status: true, sentAt: true, createdAt: true, lastError: true },
  });
}
