import { Router } from "express";
import { requireRole } from "../../middleware/auth.js";
import * as gardensService from "./gardens.service.js";

export const gardensRouter = Router();

gardensRouter.get("/:id", async (req, res) => {
  res.json({ garden: await gardensService.getGarden(req.params.id) });
});

gardensRouter.patch("/:id", async (req, res) => {
  res.json({ garden: await gardensService.updateGarden(req.user.id, req.params.id, req.body) });
});

gardensRouter.delete("/:id", requireRole("OWNER"), async (req, res) => {
  await gardensService.deleteGarden(req.user.id, req.params.id);
  res.status(204).end();
});

gardensRouter.post("/:id/zones", async (req, res) => {
  res.status(201).json({ zone: await gardensService.createZone(req.user.id, req.params.id, req.body) });
});

gardensRouter.patch("/:id/zones/:zoneId", async (req, res) => {
  res.json({ zone: await gardensService.updateZone(req.user.id, req.params.id, req.params.zoneId, req.body) });
});

gardensRouter.delete("/:id/zones/:zoneId", async (req, res) => {
  await gardensService.deleteZone(req.user.id, req.params.id, req.params.zoneId);
  res.status(204).end();
});

gardensRouter.get("/:id/history", async (req, res) => {
  res.json({ items: await gardensService.getHistory(req.params.id) });
});

gardensRouter.post("/:id/work-logs", async (req, res) => {
  res.status(201).json({ workLog: await gardensService.addWorkLog(req.user, req.params.id, req.body) });
});
