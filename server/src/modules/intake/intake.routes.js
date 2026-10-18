import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as intakeService from "./intake.service.js";

// Verejné API pre web firmy (formulár na poruchu, objednanie servisu, kalkulačka).
export const publicRouter = Router();

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Priveľa odoslaní. Skúste to o chvíľu alebo nám zavolajte." },
});

publicRouter.post("/requests", publicLimiter, async (req, res) => {
  res.status(201).json(await intakeService.submitPublicRequest(req.body));
});

// Webhook pre prichádzajúce e-maily (Mailgun, SendGrid, Postmark... prepošlú e-mail ako JSON).
export const inboundRouter = Router();

inboundRouter.post("/email", async (req, res) => {
  intakeService.verifyInboundSecret(req.get("X-Inbound-Secret"));
  res.status(201).json(await intakeService.receiveInboundEmail(req.body));
});
