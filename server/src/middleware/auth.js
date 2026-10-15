import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { forbidden, unauthorized } from "../lib/httpError.js";

// Používateľa načíta z DB pri každej požiadavke (nie len z JWT),
// aby zmena roly alebo deaktivácia platila hneď.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized("Neplatné alebo vypršané prihlásenie.");
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.sub, isActive: true },
    select: { id: true, email: true, name: true, role: true, mustChangePassword: true, customerId: true },
  });
  if (!user) throw unauthorized("Účet už neexistuje.");

  req.user = user;
  next();
}

// Kým si používateľ nezmení dočasné heslo, môže len zmeniť heslo a zistiť, kto je.
export function requirePasswordChanged(req, res, next) {
  if (req.user.mustChangePassword) {
    throw forbidden("Najprv si zmeň dočasné heslo.");
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };
}
