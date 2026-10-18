import { Router } from "express";
import multer from "multer";
import { badRequest } from "../../lib/httpError.js";
import * as photosService from "./photos.service.js";
import { storage } from "../../lib/storage.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(badRequest("Nahrať sa dajú len obrázky."));
    cb(null, true);
  },
});

// Nahranie fotiek ku konkrétnej záhrade (pripája sa pod /gardens).
export const gardenPhotosRouter = Router({ mergeParams: true });

gardenPhotosRouter.post("/", upload.array("photos", 10), async (req, res) => {
  res.status(201).json({ photos: await photosService.addGardenPhotos(req.user, req.params.id, req.files, req.body) });
});

// Práca s jednou fotkou.
export const photosRouter = Router();

photosRouter.get("/:id/file", async (req, res) => {
  const photo = await photosService.getPhoto(req.params.id);
  res.setHeader("Content-Type", photo.mimeType);
  res.setHeader("Cache-Control", "private, max-age=86400");
  storage.open(photo.storageKey).on("error", () => res.status(404).end()).pipe(res);
});

photosRouter.delete("/:id", async (req, res) => {
  await photosService.deletePhoto(req.user.id, req.params.id);
  res.status(204).end();
});
