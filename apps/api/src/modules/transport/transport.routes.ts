import { Router } from "express";

import { requireAuthentication } from "../auth/auth.middleware.js";
import { tripIdParamsSchema } from "../trips/trip.schemas.js";
import { TripNotFoundError } from "../trips/trip.service.js";
import { transportRouteBodySchema } from "./transport.schemas.js";
import { planTripRoute, TransportProviderError } from "./transport.service.js";

export const transportRouter = Router({ mergeParams: true });
transportRouter.use(requireAuthentication);

transportRouter.post("/route", async (request, response, next) => {
  const params = tripIdParamsSchema.safeParse(request.params);
  const body = transportRouteBodySchema.safeParse(request.body);
  if (!params.success || !body.success) {
    response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Enter two valid locations and choose a travel mode" } });
    return;
  }
  try {
    const route = await planTripRoute(response.locals.user.id, params.data.tripId, body.data);
    response.status(200).json({ data: { route } });
  } catch (error) {
    if (error instanceof TripNotFoundError) {
      response.status(404).json({ error: { code: "TRIP_NOT_FOUND", message: error.message } });
      return;
    }
    if (error instanceof TransportProviderError) {
      response.status(502).json({ error: { code: "ROUTE_UNAVAILABLE", message: error.message } });
      return;
    }
    next(error);
  }
});
