import { Router } from "express";
import { requireRole } from "../../middleware/auth.js";
import * as portalService from "./portal.service.js";

export const portalRouter = Router();
portalRouter.use(requireRole("CUSTOMER"));

portalRouter.get("/overview", async (req, res) => {
  res.json(await portalService.getOverview(req.user));
});

portalRouter.get("/requests", async (req, res) => {
  res.json(await portalService.listRequests(req.user, req.query));
});

portalRouter.post("/requests", async (req, res) => {
  res.status(201).json(await portalService.createRequest(req.user, req.body));
});

portalRouter.get("/history", async (req, res) => {
  res.json(await portalService.listHistory(req.user, req.query));
});

portalRouter.patch("/preferences", async (req, res) => {
  res.json(await portalService.updatePreferences(req.user, req.body));
});

portalRouter.get("/export", async (req, res) => {
  const data = await portalService.exportOwnData(req.user);
  res.setHeader("Content-Disposition", 'attachment; filename="moje-udaje-custodia.json"');
  res.json(data);
});

export const portalAccountRouter = Router({ mergeParams: true });
portalAccountRouter.use(requireRole("OWNER"));

portalAccountRouter.get("/", async (req, res) => {
  res.json({ account: await portalService.getPortalAccount(req.params.id) });
});

portalAccountRouter.post("/", async (req, res) => {
  res.status(201).json(await portalService.createPortalAccount(req.user.id, req.params.id));
});

portalAccountRouter.post("/reset-password", async (req, res) => {
  res.json(await portalService.resetPortalPassword(req.user.id, req.params.id));
});

portalAccountRouter.patch("/", async (req, res) => {
  res.json(await portalService.setPortalActive(req.user.id, req.params.id, req.body));
});
