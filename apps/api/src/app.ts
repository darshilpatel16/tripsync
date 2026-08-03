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
import { weatherRouter } from "./modules/weather/weather.routes.js";
import { placesRouter } from "./modules/places/places.routes.js";
import { eventsRouter } from "./modules/events/events.routes.js";
import { transportRouter } from "./modules/transport/transport.routes.js";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/trips/:tripId/activities", activityRouter);
  app.use("/api/trips/:tripId/expenses", expenseRouter);
  app.use("/api/trips/:tripId/weather", weatherRouter);
  app.use("/api/trips/:tripId/places", placesRouter);
  app.use("/api/trips/:tripId/events", eventsRouter);
  app.use("/api/trips/:tripId/transport", transportRouter);
  app.use("/api/trips", tripRouter);
  app.use("/api/invitations", invitationRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
