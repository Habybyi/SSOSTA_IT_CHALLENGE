import { Prisma } from "@prisma/client";
import { HttpError } from "../lib/httpError.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Takáto adresa API neexistuje." });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details || {}) });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Takýto záznam už existuje." });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Záznam sa nenašiel." });
    }
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Neplatný JSON v požiadavke." });
  }
  console.error(err);
  res.status(500).json({ error: "Niečo sa pokazilo na serveri. Skús to znova." });
}
