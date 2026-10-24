import { Router } from "express";
import { requireRole } from "../../middleware/auth.js";
import * as materialsService from "./materials.service.js";

export const materialsRouter = Router();

materialsRouter.get("/", async (req, res) => {
  res.json({ materials: await materialsService.listMaterials(req.query) });
});

materialsRouter.get("/templates", async (req, res) => {
  res.json({ templates: await materialsService.listTemplates() });
});

materialsRouter.post("/templates", requireRole("OWNER"), async (req, res) => {
  res.status(201).json({ template: await materialsService.upsertTemplate(req.user.id, req.body) });
});

materialsRouter.delete("/templates/:id", requireRole("OWNER"), async (req, res) => {
  await materialsService.deleteTemplate(req.user.id, req.params.id);
  res.status(204).end();
});

materialsRouter.post("/", requireRole("OWNER"), async (req, res) => {
  res.status(201).json({ material: await materialsService.createMaterial(req.user.id, req.body) });
});

materialsRouter.patch("/:id", requireRole("OWNER"), async (req, res) => {
  res.json({ material: await materialsService.updateMaterial(req.user.id, req.params.id, req.body) });
});

materialsRouter.post("/:id/receive", async (req, res) => {
  res.json({ material: await materialsService.receiveMaterial(req.user.id, req.params.id, req.body) });
});
