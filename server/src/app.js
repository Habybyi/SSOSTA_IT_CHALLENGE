import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { apiRouter } from "./routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";

export function createApp() {
  const app = express();
  app.use(helmet());
  // Za proxy (nasadenie) kvôli správnej IP pri obmedzení počtu požiadaviek.
  // Vercel + Render = 2 proxy pred serverom, lokálne Vite = 1.
  app.set("trust proxy", Number(process.env.TRUST_PROXY || 1));
  app.use(cors({ origin: [config.clientOrigin, ...config.websiteOrigins] }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestLogger);

  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
