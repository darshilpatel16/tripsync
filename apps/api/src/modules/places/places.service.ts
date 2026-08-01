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

const overpassResponseSchema = z.object({
  elements: z.array(
    z.object({
      type: z.enum(["node", "way", "relation"]),
      id: z.number(),
      lat: z.number().optional(),
      lon: z.number().optional(),
      center: z.object({ lat: z.number(), lon: z.number() }).optional(),
      tags: z.record(z.string(), z.string()).optional(),
    }),
  ),
});

type PlaceCategory = "RESTAURANT" | "CAFE" | "ATTRACTION" | "MUSEUM";

type CachedPlaces = {
  expiresAt: number;
  value: Awaited<ReturnType<typeof loadPlaces>>;
};

const placesCache = new Map<string, CachedPlaces>();
const CACHE_DURATION_MS = 15 * 60 * 1000;

export class PlacesProviderError extends Error {
  constructor() {
    super("Nearby places are temporarily unavailable");
    this.name = "PlacesProviderError";
  }
}

const fetchJson = async (url: string | URL, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        "User-Agent": "TripSync portfolio travel planner",
        ...options.headers,
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new PlacesProviderError();
    return await response.json();
  } catch (error) {
    if (error instanceof PlacesProviderError) throw error;
    throw new PlacesProviderError();
  }
};

const categoryFor = (tags: Record<string, string>): PlaceCategory | null => {
  if (tags.amenity === "restaurant") return "RESTAURANT";
  if (tags.amenity === "cafe") return "CAFE";
  if (tags.tourism === "museum") return "MUSEUM";
  if (tags.tourism === "attraction") return "ATTRACTION";
  return null;
};

const addressFor = (tags: Record<string, string>) =>
  [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:city"],
  ]
    .filter(Boolean)
    .join(", ") || null;

const loadPlaces = async (destination: string) => {
  const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodingUrl.search = new URLSearchParams({
    name: destination,
    count: "1",
    language: "en",
    format: "json",
  }).toString();
  const geocoding = geocodingResponseSchema.safeParse(
    await fetchJson(geocodingUrl),
  );
  if (!geocoding.success) throw new PlacesProviderError();
  const location = geocoding.data.results?.[0];
  if (!location) {
    return {
      status: "UNAVAILABLE" as const,
      reason: "LOCATION_NOT_FOUND" as const,
      message: "We could not find this destination. Try adding the city and country.",
    };
  }

  const query = `[out:json][timeout:12];
(
  nwr(around:5000,${location.latitude},${location.longitude})["amenity"="restaurant"]["name"];
  nwr(around:5000,${location.latitude},${location.longitude})["amenity"="cafe"]["name"];
  nwr(around:5000,${location.latitude},${location.longitude})["tourism"="attraction"]["name"];
  nwr(around:5000,${location.latitude},${location.longitude})["tourism"="museum"]["name"];
);
out center 60;`;
  const overpass = overpassResponseSchema.safeParse(
    await fetchJson("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }),
    }),
  );
  if (!overpass.success) throw new PlacesProviderError();

  const places = overpass.data.elements.flatMap((element) => {
    const tags = element.tags ?? {};
    const category = categoryFor(tags);
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    if (!category || latitude === undefined || longitude === undefined || !tags.name) {
      return [];
    }
    return [{
      id: `${element.type}/${element.id}`,
      name: tags.name,
      category,
      latitude,
      longitude,
      address: addressFor(tags),
      cuisine: tags.cuisine ?? null,
      website: tags.website ?? tags["contact:website"] ?? null,
      osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    }];
  });

  return {
    status: "AVAILABLE" as const,
    location: {
      name: location.name,
      region: location.admin1 ?? null,
      country: location.country ?? null,
      latitude: location.latitude,
      longitude: location.longitude,
    },
    places: places.sort((a, b) => a.name.localeCompare(b.name)),
    attribution: "Place data © OpenStreetMap contributors",
  };
};

export const getTripPlaces = async (userId: string, tripId: string) => {
  const trip = await getTrip(userId, tripId);
  const cacheKey = trip.destination.trim().toLowerCase();
  const cached = placesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const value = await loadPlaces(trip.destination);
  placesCache.set(cacheKey, { expiresAt: Date.now() + CACHE_DURATION_MS, value });
  return value;
};

export const clearPlacesCache = () => placesCache.clear();
