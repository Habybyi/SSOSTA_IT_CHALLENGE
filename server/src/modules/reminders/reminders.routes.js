import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/auth.js";
import { parse } from "../../lib/validate.js";
import * as remindersService from "./reminders.service.js";

export const remindersRouter = Router();

remindersRouter.get("/settings", async (req, res) => {
  res.json({ settings: await remindersService.getReminderSettings() });
});

remindersRouter.put("/settings", requireRole("OWNER"), async (req, res) => {
  res.json({ settings: await remindersService.updateReminderSettings(req.user.id, req.body) });
});

remindersRouter.get("/seasonal", async (req, res) => {
  res.json({ campaigns: await remindersService.getSeasonalOverview() });
});

const typeSchema = z.object({ type: z.enum(remindersService.SEASONAL_TYPES, { message: "Neznámy typ kampane." }) });

remindersRouter.get("/seasonal/recipients", async (req, res) => {
  const { type } = parse(typeSchema, req.query);
  res.json({ recipients: await remindersService.getSeasonalRecipients(type) });
});

remindersRouter.post("/seasonal/run", requireRole("OWNER"), async (req, res) => {
  const { type } = parse(typeSchema, req.body);
  res.json(await remindersService.runSeasonalCampaign(req.user.id, type));
});

// Ručné spustenie pripomienok na zajtra (inak idú samé od nastavenej hodiny).
remindersRouter.post("/tomorrow/run", requireRole("OWNER"), async (req, res) => {
  res.json(await remindersService.queueTomorrowReminders());
});
