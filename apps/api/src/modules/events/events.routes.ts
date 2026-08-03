import { Router } from "express";

import { requireAuthentication } from "../auth/auth.middleware.js";
import { tripIdParamsSchema } from "../trips/trip.schemas.js";
import { TripNotFoundError } from "../trips/trip.service.js";
import { EventsProviderError, getTripEvents } from "./events.service.js";

export const eventsRouter = Router({ mergeParams: true });
eventsRouter.use(requireAuthentication);

eventsRouter.get("/", async (request, response, next) => {
  const params = tripIdParamsSchema.safeParse(request.params);
  if (!params.success) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "The trip ID is invalid" } });
    return;
  }
  try {
    const events = await getTripEvents(response.locals.user.id, params.data.tripId);
    response.status(200).json({ data: { events } });
  } catch (error) {
    if (error instanceof TripNotFoundError) {
      response.status(404).json({ error: { code: "TRIP_NOT_FOUND", message: error.message } });
      return;
    }
    if (error instanceof EventsProviderError) {
      response.status(502).json({ error: { code: "EVENTS_UNAVAILABLE", message: error.message } });
      return;
    }
    next(error);
  }
});
