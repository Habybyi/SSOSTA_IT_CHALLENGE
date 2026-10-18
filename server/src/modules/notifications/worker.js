import { prisma } from "../../lib/prisma.js";
import { renderTemplate } from "./templates.js";
import { sendEmail } from "./mailer.js";

const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 5;
const INTERVAL_MS = 10_000;

// Spracuje čakajúce notifikácie. Každú si najprv "zarezervuje" podmieneným updatom
// (attempts sa musí zhodovať), takže ani dva bežiace servery nepošlú e-mail dvakrát.
export async function processPendingNotifications() {
  const pending = await prisma.notification.findMany({
    where: { status: "PENDING", scheduledFor: { lte: new Date() } },
    orderBy: { scheduledFor: "asc" },
    take: BATCH_SIZE,
  });

  for (const n of pending) {
    const claimed = await prisma.notification.updateMany({
      where: { id: n.id, status: "PENDING", attempts: n.attempts },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    try {
      if (n.channel !== "EMAIL") throw new Error(`Kanál ${n.channel} zatiaľ nie je podporovaný.`);
      const message = renderTemplate(n.template, n.payload);
      await sendEmail({ to: n.recipient, ...message });
      await prisma.notification.update({ where: { id: n.id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
    } catch (err) {
      const attempts = n.attempts + 1;
      const failed = attempts >= MAX_ATTEMPTS;
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          status: failed ? "FAILED" : "PENDING",
          lastError: String(err.message).slice(0, 500),
          // Ďalší pokus o 1, 4, 9, 16 minút.
          scheduledFor: failed ? undefined : new Date(Date.now() + attempts * attempts * 60_000),
        },
      });
    }
  }
  return pending.length;
}

// Jednoduchý interval v rámci API servera. Pri väčšej záťaži sa nahradí frontou
// (Redis/BullMQ) a samostatným procesom, zvyšok aplikácie sa nemení.
export function startNotificationWorker() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await processPendingNotifications();
    } catch (err) {
      console.error("Worker notifikácií zlyhal:", err.message);
    } finally {
      running = false;
    }
  };
  tick();
  return setInterval(tick, INTERVAL_MS);
}
