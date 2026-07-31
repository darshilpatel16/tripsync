import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authRouter } from "./modules/auth/auth.routes.js";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { tripRouter } from "./modules/trips/trip.routes.js";
import cookieParser from "cookie-parser";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/trips", tripRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
