import { Router } from "express";
import { requireRole } from "../../middleware/auth.js";
import * as settingsService from "./settings.service.js";
import * as capacityService from "./capacity.service.js";
import * as appointmentsService from "./appointments.service.js";

// Plánovanie: kapacita dní, nastavenia, plánovač sezóny.
export const scheduleRouter = Router();

scheduleRouter.get("/settings", async (req, res) => {
  res.json({ settings: await settingsService.getScheduleSettings() });
});

scheduleRouter.put("/settings", requireRole("OWNER"), async (req, res) => {
  res.json({ settings: await settingsService.updateScheduleSettings(req.user.id, req.body) });
});

scheduleRouter.get("/capacity", async (req, res) => {
  const { from, to } = capacityService.parseRange(req.query);
  res.json({ days: await capacityService.getCapacity(from, to) });
});

scheduleRouter.put("/capacity/:date", requireRole("OWNER"), async (req, res) => {
  res.json({ day: await capacityService.setDayCapacity(req.user.id, req.params.date, req.body) });
});

scheduleRouter.delete("/capacity/:date", requireRole("OWNER"), async (req, res) => {
  res.json({ day: await capacityService.resetDayCapacity(req.user.id, req.params.date) });
});

scheduleRouter.get("/planner", async (req, res) => {
  res.json({ groups: await appointmentsService.getPlannerGroups(req.query) });
});

scheduleRouter.post("/plan-day", async (req, res) => {
  res.json(await appointmentsService.planDay(req.user, req.body));
});

// Termíny (výjazdy).
export const appointmentsRouter = Router();

appointmentsRouter.get("/", async (req, res) => {
  res.json({ appointments: await appointmentsService.listAppointments(req.query) });
});

appointmentsRouter.post("/", async (req, res) => {
  res.status(201).json({ appointment: await appointmentsService.createAppointment(req.user, req.body) });
});

appointmentsRouter.get("/:id", async (req, res) => {
  res.json({ appointment: await appointmentsService.getAppointment(req.params.id) });
});

appointmentsRouter.patch("/:id", async (req, res) => {
  res.json({ appointment: await appointmentsService.updateAppointment(req.user, req.params.id, req.body) });
});

appointmentsRouter.post("/:id/cancel", async (req, res) => {
  res.json({ appointment: await appointmentsService.cancelAppointment(req.user, req.params.id, req.body) });
});
