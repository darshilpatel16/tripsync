import cors from "cors";
import express from "express";
import helmet from "helmet";
import { authRouter } from "./modules/auth/auth.routes.js";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { tripRouter } from "./modules/trips/trip.routes.js";
import { invitationRouter } from "./modules/trips/invitation.routes.js";
import cookieParser from "cookie-parser";
import { activityRouter } from "./modules/activities/activity.routes.js";
import { expenseRouter } from "./modules/expenses/expense.routes.js";
import { requireSameOrigin } from "./middleware/same-origin.js";

export const createApp = () => {
  const app = express();

  // Vercel terminates HTTPS before forwarding requests. Trust exactly one
  // proxy hop so request.ip and secure-request metadata reflect the visitor.
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");
  app.use(helmet());
  // Production serves the web client and API from one Vercel domain, so the
  // browser's same-origin policy provides a stricter boundary than CORS.
  if (env.NODE_ENV !== "production") {
    app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  }
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(requireSameOrigin);
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/trips/:tripId/activities", activityRouter);
  app.use("/api/trips/:tripId/expenses", expenseRouter);
  app.use("/api/trips", tripRouter);
  app.use("/api/invitations", invitationRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
