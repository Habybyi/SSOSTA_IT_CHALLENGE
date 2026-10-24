import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(process.env.UPLOAD_DIR || "uploads");

const resolveKey = (key) => {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Neplatný kľúč súboru.");
  return full;
};

export const storage = {
  async save(buffer, extension) {
    const now = new Date();
    const folder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const key = `${folder}/${crypto.randomUUID()}.${extension}`;
    await fs.mkdir(path.join(ROOT, folder), { recursive: true });
    await fs.writeFile(resolveKey(key), buffer);
    return key;
  },

  open(key) {
    return createReadStream(resolveKey(key));
  },

  async remove(key) {
    await fs.rm(resolveKey(key), { force: true });
  },
};
