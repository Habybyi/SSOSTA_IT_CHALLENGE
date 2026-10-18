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

// Všetko pod /api/v1, aby sa dala neskôr pridať v2 bez rozbitia starých klientov.
export const apiRouter = Router();

apiRouter.get("/health", (req, res) => res.json({ status: "ok" }));
apiRouter.use("/auth", authRouter);

// Bez prihlásenia: web firmy a e-mailový webhook (ten má vlastný tajný kľúč).
apiRouter.use("/public", publicRouter);
apiRouter.use("/inbound", inboundRouter);

// Odtiaľto už len prihlásení používatelia s vlastným heslom.
apiRouter.use(requireAuth, requirePasswordChanged);
apiRouter.use("/users", usersRouter);

// Interné dáta firmy: majiteľ a technici (zákazník má neskôr vlastný portál).
const staffOnly = requireRole("OWNER", "TECHNICIAN");
apiRouter.use("/customers", staffOnly, customersRouter);
apiRouter.use("/gardens/:id/photos", staffOnly, gardenPhotosRouter);
apiRouter.use("/gardens", staffOnly, gardensRouter);
apiRouter.use("/photos", staffOnly, photosRouter);
apiRouter.use("/requests", staffOnly, requestsRouter);
apiRouter.use("/schedule", staffOnly, scheduleRouter);
apiRouter.use("/appointments", staffOnly, appointmentsRouter);
