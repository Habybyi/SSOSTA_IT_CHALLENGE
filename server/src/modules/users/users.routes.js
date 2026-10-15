import { Router } from "express";
import { requireRole } from "../../middleware/auth.js";
import * as usersService from "./users.service.js";

// Správa tímu: len majiteľ.
export const usersRouter = Router();
usersRouter.use(requireRole("OWNER"));

usersRouter.get("/", async (req, res) => {
  res.json(await usersService.listStaff(req.query));
});

usersRouter.post("/", async (req, res) => {
  res.status(201).json(await usersService.createStaff(req.user.id, req.body));
});

usersRouter.patch("/:id", async (req, res) => {
  res.json({ user: await usersService.updateStaff(req.user.id, req.params.id, req.body) });
});

usersRouter.post("/:id/reset-password", async (req, res) => {
  res.json(await usersService.resetPassword(req.user.id, req.params.id));
});
