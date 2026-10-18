import { z } from "zod";

// Spoločné typy polí pre formuláre. Prázdny reťazec z formulára = null v DB,
// undefined = pole sa nemení (dôležité pri PATCH).

const emptyToNull = (v) => (v === "" ? null : v);

export const optionalText = (max = 500) =>
  z.preprocess(
    (v) => (typeof v === "string" ? emptyToNull(v.trim()) : v),
    z.string().max(max, `Maximálne ${max} znakov.`).nullable().optional()
  );

export const requiredText = (message, max = 200) =>
  z.string({ message }).trim().min(1, message).max(max, `Maximálne ${max} znakov.`);

export const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" ? emptyToNull(v.trim().toLowerCase()) : v),
  z.email("Zadaj platný e-mail.").nullable().optional()
);

export const optionalNumber = ({ min, max, int = false } = {}) => {
  let num = z.number({ message: "Zadaj číslo." });
  if (int) num = num.int("Zadaj celé číslo.");
  if (min !== undefined) num = num.min(min, `Najmenej ${min}.`);
  if (max !== undefined) num = num.max(max, `Najviac ${max}.`);
  return z.preprocess((v) => {
    if (v === "" || v === null) return null;
    if (typeof v === "string") return Number(v.replace(",", "."));
    return v;
  }, num.nullable().optional());
};

export const optionalBoolean = z.boolean().optional();

export const uuidParam = z.uuid("Neplatné ID.");
