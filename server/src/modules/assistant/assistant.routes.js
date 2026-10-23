import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../../config.js";
import { HttpError } from "../../lib/httpError.js";
import { parse } from "../../lib/validate.js";

// AI asistent na webe (Google Gemini). Kľúč je len tu na serveri, prehliadač ho nikdy nevidí.
// Bez kľúča vráti 503 a web odpovedá z pripravených otázok (FAQ).
export const assistantRouter = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Priveľa otázok naraz, skúste to o chvíľu." },
});

const part = z.object({ text: z.string().max(8000) });
const schema = z.object({
  system_instruction: z.object({ parts: z.array(part).max(1) }).optional(),
  contents: z
    .array(z.object({ role: z.enum(["user", "model"]), parts: z.array(z.object({ text: z.string().max(2000) })).max(1) }))
    .min(1)
    .max(30),
});

assistantRouter.post("/", limiter, async (req, res) => {
  if (!config.gemini.apiKey) throw new HttpError(503, "AI asistent nie je nastavený.");
  const data = parse(schema, req.body);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.gemini.model)}:generateContent`;
  // Posielame len to, čo web potrebuje: posledných 12 správ a pevné nastavenia generovania.
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": config.gemini.apiKey },
    body: JSON.stringify({
      system_instruction: data.system_instruction,
      contents: data.contents.slice(-12),
      generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
    }),
    signal: AbortSignal.timeout(20000),
  }).catch(() => null);
  if (!response) throw new HttpError(502, "AI asistent neodpovedá.");
  res.status(response.status).json(await response.json().catch(() => ({ error: "Neplatná odpoveď AI." })));
});
