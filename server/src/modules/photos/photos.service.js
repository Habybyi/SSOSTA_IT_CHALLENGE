import sharp from "sharp";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { badRequest, notFound } from "../../lib/httpError.js";
import { parse } from "../../lib/validate.js";
import { optionalText } from "../../lib/fields.js";
import { storage } from "../../lib/storage.js";
import { logAudit } from "../audit/audit.service.js";

const captionSchema = z.object({ caption: optionalText(300) });

async function normalizeImage(buffer) {
  try {
    return await sharp(buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw badRequest("Súbor nie je platný obrázok.");
  }
}

export async function addGardenPhotos(actor, gardenId, files, body) {
  if (!files?.length) throw badRequest("Vyber aspoň jednu fotku.");
  const { caption } = parse(captionSchema, body);
  const garden = await prisma.garden.findFirst({ where: { id: gardenId, deletedAt: null } });
  if (!garden) throw notFound("Záhrada sa nenašla.");

  const photos = [];
  for (const file of files) {
    const image = await normalizeImage(file.buffer);
    const storageKey = await storage.save(image, "webp");
    photos.push(
      await prisma.photo.create({
        data: { storageKey, mimeType: "image/webp", sizeBytes: image.length, caption, gardenId, uploadedById: actor.id },
        select: { id: true, caption: true, createdAt: true },
      })
    );
  }
  await logAudit({ userId: actor.id, action: "PHOTOS_ADDED", entityType: "Garden", entityId: gardenId, details: { count: photos.length } });
  return photos;
}

export async function getPhoto(id) {
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) throw notFound("Fotka sa nenašla.");
  return photo;
}

export async function deletePhoto(actorId, id) {
  const photo = await getPhoto(id);
  await prisma.photo.delete({ where: { id } });
  await storage.remove(photo.storageKey);
  await logAudit({ userId: actorId, action: "PHOTO_DELETED", entityType: "Photo", entityId: id });
}
