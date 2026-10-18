import { Prisma } from "@prisma/client";
import multer from "multer";
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
    // P2023 = neplatné UUID v adrese, pre používateľa je to "nenašlo sa".
    if (err.code === "P2025" || err.code === "P2023") {
      return res.status(404).json({ error: "Záznam sa nenašiel." });
    }
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Fotka je príliš veľká (max. 15 MB)." : "Nahrávanie súborov zlyhalo.";
    return res.status(400).json({ error: message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Neplatný JSON v požiadavke." });
  }
  console.error(err);
  res.status(500).json({ error: "Niečo sa pokazilo na serveri. Skús to znova." });
}
