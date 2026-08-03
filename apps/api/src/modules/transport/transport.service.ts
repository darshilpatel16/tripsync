import { z } from "zod";

import { env } from "../../config/env.js";
import { getTrip } from "../trips/trip.service.js";
import type { TransportRouteBody } from "./transport.schemas.js";

const geocodingResponseSchema = z.object({
  results: z.array(z.object({ name: z.string(), latitude: z.number(), longitude: z.number(), country: z.string().optional(), admin1: z.string().optional() })).optional(),
});

const routeResponseSchema = z.object({
  features: z.array(z.object({
    geometry: z.object({ type: z.literal("LineString"), coordinates: z.array(z.tuple([z.number(), z.number()])) }),
    properties: z.object({
      summary: z.object({ distance: z.number(), duration: z.number() }),
      segments: z.array(z.object({
        steps: z.array(z.object({ instruction: z.string(), distance: z.number(), duration: z.number(), name: z.string().optional() })),
      })).optional(),
    }),
  })).min(1),
});

const profiles = { DRIVING: "driving-car", WALKING: "foot-walking", CYCLING: "cycling-regular" } as const;
type GeocodedPlace = { name: string; label: string; latitude: number; longitude: number };

export class TransportProviderError extends Error {
  constructor(message = "Route planning is temporarily unavailable") {
    super(message);
    this.name = "TransportProviderError";
  }
}

const fetchJson = async (url: URL, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, { ...options, headers: { Accept: "application/json", ...options.headers }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new TransportProviderError();
    return await response.json();
  } catch (error) {
    if (error instanceof TransportProviderError) throw error;
    throw new TransportProviderError();
  }
};

const geocode = async (query: string): Promise<GeocodedPlace | null> => {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: query, count: "1", language: "en", format: "json" }).toString();
  const parsed = geocodingResponseSchema.safeParse(await fetchJson(url));
  if (!parsed.success) throw new TransportProviderError();
  const result = parsed.data.results?.[0];
  if (!result) return null;
  return {
    name: result.name,
    label: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
    latitude: result.latitude,
    longitude: result.longitude,
  };
};

export const planTripRoute = async (userId: string, tripId: string, input: TransportRouteBody) => {
  await getTrip(userId, tripId);
  if (!env.OPENROUTESERVICE_API_KEY) {
    return { status: "NOT_CONFIGURED" as const, message: "Route planning needs one server setting before journeys can load." };
  }

  const [from, to] = await Promise.all([geocode(input.from), geocode(input.to)]);
  if (!from || !to) {
    return { status: "UNAVAILABLE" as const, reason: "LOCATION_NOT_FOUND" as const, message: "We could not find one of these locations. Add a city, postcode, or country to make it more specific." };
  }

  const url = new URL(`https://api.openrouteservice.org/v2/directions/${profiles[input.mode]}/geojson`);
  const parsed = routeResponseSchema.safeParse(await fetchJson(url, {
    method: "POST",
    headers: { Authorization: env.OPENROUTESERVICE_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates: [[from.longitude, from.latitude], [to.longitude, to.latitude]], instructions: true, language: "en" }),
  }));
  if (!parsed.success) throw new TransportProviderError();
  const feature = parsed.data.features[0];
  if (!feature) throw new TransportProviderError();

  return {
    status: "AVAILABLE" as const,
    mode: input.mode,
    from,
    to,
    distanceMetres: feature.properties.summary.distance,
    durationSeconds: feature.properties.summary.duration,
    coordinates: feature.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    steps: (feature.properties.segments ?? []).flatMap((segment) => segment.steps).map((step) => ({ instruction: step.instruction, distanceMetres: step.distance, durationSeconds: step.duration, roadName: step.name ?? null })),
    attribution: "Routing provided by openrouteservice",
  };
};
