import { Router } from "express";

import { requireAuthentication } from "../auth/auth.middleware.js";
import { tripIdParamsSchema } from "../trips/trip.schemas.js";
import { TripNotFoundError } from "../trips/trip.service.js";
import { getTripWeather, WeatherProviderError } from "./weather.service.js";

export const weatherRouter = Router({ mergeParams: true });

weatherRouter.use(requireAuthentication);

weatherRouter.get("/", async (request, response, next) => {
  const params = tripIdParamsSchema.safeParse(request.params);
  if (!params.success) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The trip ID is invalid",
        details: params.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  try {
    const weather = await getTripWeather(
      response.locals.user.id,
      params.data.tripId,
    );
    response.status(200).json({ data: { weather } });
  } catch (error) {
    if (error instanceof TripNotFoundError) {
      response.status(404).json({
        error: { code: "TRIP_NOT_FOUND", message: error.message },
      });
      return;
    }
    if (error instanceof WeatherProviderError) {
      response.status(502).json({
        error: { code: "WEATHER_UNAVAILABLE", message: error.message },
      });
      return;
    }
    next(error);
  }
});
