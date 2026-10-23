import { Router } from "express";
import { requireAuth, requirePasswordChanged, requireRole } from "./middleware/auth.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";
import { gardensRouter } from "./modules/gardens/gardens.routes.js";
import { gardenPhotosRouter, photosRouter } from "./modules/photos/photos.routes.js";
import { requestsRouter } from "./modules/requests/requests.routes.js";
import { inboundRouter, publicRouter } from "./modules/intake/intake.routes.js";
import { appointmentsRouter, scheduleRouter } from "./modules/schedule/schedule.routes.js";
import { materialsRouter } from "./modules/materials/materials.routes.js";
import { visitsRouter } from "./modules/visits/visits.routes.js";
import { remindersRouter } from "./modules/reminders/reminders.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { devicesRouter, gardenDevicesRouter, iotIngestRouter } from "./modules/iot/iot.routes.js";

// Všetko pod /api/v1, aby sa dala neskôr pridať v2 bez rozbitia starých klientov.
export const apiRouter = Router();

apiRouter.get("/health", (req, res) => res.json({ status: "ok" }));
apiRouter.use("/auth", authRouter);

// Bez prihlásenia: web firmy a e-mailový webhook (ten má vlastný tajný kľúč).
apiRouter.use("/public", publicRouter);
apiRouter.use("/inbound", inboundRouter);
apiRouter.use("/iot", iotIngestRouter);

// Odtiaľto už len prihlásení používatelia s vlastným heslom.
apiRouter.use(requireAuth, requirePasswordChanged);
apiRouter.use("/users", usersRouter);
apiRouter.use("/audit", auditRouter);

// Interné dáta firmy: majiteľ a technici (zákazník má neskôr vlastný portál).
const staffOnly = requireRole("OWNER", "TECHNICIAN");
apiRouter.use("/customers", staffOnly, customersRouter);
apiRouter.use("/gardens/:id/photos", staffOnly, gardenPhotosRouter);
apiRouter.use("/gardens/:id/devices", staffOnly, gardenDevicesRouter);
apiRouter.use("/devices", staffOnly, devicesRouter);
apiRouter.use("/gardens", staffOnly, gardensRouter);
apiRouter.use("/photos", staffOnly, photosRouter);
apiRouter.use("/requests", staffOnly, requestsRouter);
apiRouter.use("/schedule", staffOnly, scheduleRouter);
apiRouter.use("/appointments", staffOnly, appointmentsRouter);
apiRouter.use("/materials", staffOnly, materialsRouter);
apiRouter.use("/visits", staffOnly, visitsRouter);
apiRouter.use("/reminders", staffOnly, remindersRouter);
