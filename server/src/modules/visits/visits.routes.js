import { Router } from "express";
import * as visitsService from "./visits.service.js";

export const visitsRouter = Router();

visitsRouter.get("/:appointmentId", async (req, res) => {
  res.json(await visitsService.getVisit(req.params.appointmentId));
});

visitsRouter.post("/:appointmentId/complete", async (req, res) => {
  res.json(await visitsService.completeVisit(req.user, req.params.appointmentId, req.body));
});
