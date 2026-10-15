import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { apiRouter } from "./routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
