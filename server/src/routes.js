import { Router } from "express";
import { requireAuth, requirePasswordChanged } from "./middleware/auth.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

// Všetko pod /api/v1, aby sa dala neskôr pridať v2 bez rozbitia starých klientov.
export const apiRouter = Router();

apiRouter.get("/health", (req, res) => res.json({ status: "ok" }));
apiRouter.use("/auth", authRouter);

// Odtiaľto už len prihlásení používatelia s vlastným heslom.
apiRouter.use(requireAuth, requirePasswordChanged);
apiRouter.use("/users", usersRouter);
