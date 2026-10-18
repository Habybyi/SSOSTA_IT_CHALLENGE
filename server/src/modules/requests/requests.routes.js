import { Router } from "express";
import * as requestsService from "./requests.service.js";

export const requestsRouter = Router();

requestsRouter.get("/", async (req, res) => {
  res.json(await requestsService.listRequests(req.user, req.query));
});

requestsRouter.get("/stats", async (req, res) => {
  res.json(await requestsService.getStats(req.user));
});

requestsRouter.get("/assignees", async (req, res) => {
  res.json({ users: await requestsService.listAssignees() });
});

requestsRouter.post("/", async (req, res) => {
  res.status(201).json({ request: await requestsService.createRequest(req.user, req.body) });
});

requestsRouter.get("/:id", async (req, res) => {
  res.json({ request: await requestsService.getRequest(req.params.id) });
});

requestsRouter.patch("/:id", async (req, res) => {
  res.json({ request: await requestsService.updateRequest(req.user, req.params.id, req.body) });
});

requestsRouter.post("/:id/status", async (req, res) => {
  res.json({ request: await requestsService.changeStatus(req.user, req.params.id, req.body) });
});
