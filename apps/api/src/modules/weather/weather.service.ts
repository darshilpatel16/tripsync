import { z } from "zod";

import { getTrip } from "../trips/trip.service.js";

const geocodingResponseSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

const forecastResponseSchema = z.object({
  timezone: z.string(),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number()),
    temperature_2m_max: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
    precipitation_probability_max: z.array(z.number().nullable()),
    wind_speed_10m_max: z.array(z.number()),
  }),
});

export class WeatherProviderError extends Error {
  constructor() {
    super("Weather information is temporarily unavailable");
    this.name = "WeatherProviderError";
  }
}

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const addUtcDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const fetchJson = async (url: URL) => {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new WeatherProviderError();
    return await response.json();
  } catch (error) {
    if (error instanceof WeatherProviderError) throw error;
    throw new WeatherProviderError();
  }
};

export const getTripWeather = async (userId: string, tripId: string) => {
  const trip = await getTrip(userId, tripId);
  const tripStart = toIsoDate(trip.startDate);
  const tripEnd = toIsoDate(trip.endDate);
  const todayDate = new Date();
  const today = toIsoDate(todayDate);
  const forecastLimit = toIsoDate(addUtcDays(todayDate, 15));

  if (tripEnd < today) {
    return {
      status: "UNAVAILABLE" as const,
      reason: "TRIP_ENDED" as const,
      message: "This trip has already ended, so a live forecast is no longer available.",
    };
  }

  if (tripStart > forecastLimit) {
    return {
      status: "UNAVAILABLE" as const,
      reason: "TOO_EARLY" as const,
      message: "A reliable forecast will appear 16 days before your trip begins.",
      forecastAvailableFrom: toIsoDate(addUtcDays(trip.startDate, -15)),
    };
  }

  const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodingUrl.search = new URLSearchParams({
    name: trip.destination,
    count: "1",
    language: "en",
    format: "json",
  }).toString();

  const geocodingResult = geocodingResponseSchema.safeParse(
    await fetchJson(geocodingUrl),
  );
  if (!geocodingResult.success) throw new WeatherProviderError();
  const location = geocodingResult.data.results?.[0];
  if (!location) {
    return {
      status: "UNAVAILABLE" as const,
      reason: "LOCATION_NOT_FOUND" as const,
      message: "We could not match this destination to a forecast location. Try making the destination more specific.",
    };
  }

  const startDate = tripStart < today ? today : tripStart;
  const endDate = tripEnd > forecastLimit ? forecastLimit : tripEnd;
  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    start_date: startDate,
    end_date: endDate,
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(","),
    timezone: "auto",
  }).toString();

  const forecastResult = forecastResponseSchema.safeParse(
    await fetchJson(forecastUrl),
  );
  if (!forecastResult.success) throw new WeatherProviderError();
  const daily = forecastResult.data.daily;

  return {
    status: "AVAILABLE" as const,
    location: {
      name: location.name,
      region: location.admin1 ?? null,
      country: location.country ?? null,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: forecastResult.data.timezone,
    },
    forecast: {
      startDate,
      endDate,
      isPartial: startDate !== tripStart || endDate !== tripEnd,
    },
    days: daily.time.map((date, index) => ({
      date,
      weatherCode: daily.weather_code[index],
      temperatureMaxC: daily.temperature_2m_max[index],
      temperatureMinC: daily.temperature_2m_min[index],
      precipitationProbability: daily.precipitation_probability_max[index] ?? 0,
      windSpeedMaxKph: daily.wind_speed_10m_max[index],
    })),
    attribution: "Weather data by Open-Meteo.com",
  };
};
