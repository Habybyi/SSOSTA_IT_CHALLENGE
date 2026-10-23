import { Router } from "express";
import { requireRole } from "../../middleware/auth.js";
import * as auditService from "./audit.service.js";

// Logy: kto čo kedy spravil. Len majiteľ.
export const auditRouter = Router();
auditRouter.use(requireRole("OWNER"));

auditRouter.get("/", async (req, res) => {
  res.json(await auditService.listAudit(req.query));
});
