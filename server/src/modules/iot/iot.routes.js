import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireRole } from "../../middleware/auth.js";
import * as iotService from "./iot.service.js";

export const iotIngestRouter = Router();

const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Priveľa správ zo zariadení, spomaľ odosielanie." },
});

iotIngestRouter.post("/readings", ingestLimiter, express.urlencoded({ extended: false, limit: "10kb" }), async (req, res) => {
  const token = req.get("X-Device-Token") || req.body?.token;
  res.status(201).json(await iotService.receiveReading(token, req.body));
});

export const gardenDevicesRouter = Router({ mergeParams: true });

gardenDevicesRouter.get("/", async (req, res) => {
  res.json({ devices: await iotService.listGardenDevices(req.params.id) });
});

gardenDevicesRouter.post("/", requireRole("OWNER"), async (req, res) => {
  res.status(201).json(await iotService.createDevice(req.user.id, req.params.id, req.body));
});

export const devicesRouter = Router();
devicesRouter.use(requireRole("OWNER"));

devicesRouter.post("/:id/token", async (req, res) => {
  res.json(await iotService.regenerateToken(req.user.id, req.params.id));
});

devicesRouter.delete("/:id", async (req, res) => {
  await iotService.deleteDevice(req.user.id, req.params.id);
  res.status(204).end();
});
