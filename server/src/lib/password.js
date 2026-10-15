import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const ROUNDS = 12;

export const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// Dočasné heslo pre nový účet: čitateľné (bez 0/O, 1/l), aby ho Milan vedel nadiktovať.
export function generateTempPassword(length = 10) {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
