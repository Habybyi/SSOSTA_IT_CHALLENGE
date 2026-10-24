import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middleware/auth.js";
import * as authService from "./auth.service.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Priveľa pokusov o prihlásenie. Skús to o chvíľu." },
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  res.json(await authService.login(req.body));
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

authRouter.post("/change-password", requireAuth, async (req, res) => {
  res.json({ user: await authService.changePassword(req.user.id, req.body) });
});
