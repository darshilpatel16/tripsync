import { z } from "zod";

import { env } from "../../config/env.js";
import { getTrip } from "../trips/trip.service.js";

const geocodingResponseSchema = z.object({
  results: z.array(z.object({
    name: z.string(),
    country: z.string().optional(),
    country_code: z.string().optional(),
  })).optional(),
});

const ticketmasterResponseSchema = z.object({
  _embedded: z.object({
    events: z.array(z.object({
      id: z.string(),
      name: z.string(),
      url: z.string().url(),
      dates: z.object({
        start: z.object({
          dateTime: z.string().optional(),
          localDate: z.string(),
          localTime: z.string().optional(),
        }),
        end: z.object({ dateTime: z.string().optional() }).optional(),
        status: z.object({ code: z.string().optional() }).optional(),
      }),
      images: z.array(z.object({
        url: z.string().url(),
        width: z.number().optional(),
        ratio: z.string().optional(),
      })).optional(),
      classifications: z.array(z.object({
        segment: z.object({ name: z.string().optional() }).optional(),
        genre: z.object({ name: z.string().optional() }).optional(),
      })).optional(),
      priceRanges: z.array(z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        currency: z.string().optional(),
      })).optional(),
      _embedded: z.object({
        venues: z.array(z.object({
          name: z.string().optional(),
          city: z.object({ name: z.string().optional() }).optional(),
          country: z.object({ name: z.string().optional() }).optional(),
          address: z.object({ line1: z.string().optional() }).optional(),
          location: z.object({
            latitude: z.string().optional(),
            longitude: z.string().optional(),
          }).optional(),
        })),
      }).optional(),
    })),
  }).optional(),
});

type CachedEvents = { expiresAt: number; value: Awaited<ReturnType<typeof loadEvents>> };
const eventsCache = new Map<string, CachedEvents>();
const CACHE_DURATION_MS = 15 * 60 * 1000;

export class EventsProviderError extends Error {
  constructor() {
    super("Live events are temporarily unavailable");
    this.name = "EventsProviderError";
  }
}

const fetchJson = async (url: URL) => {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new EventsProviderError();
    return await response.json();
  } catch (error) {
    if (error instanceof EventsProviderError) throw error;
    throw new EventsProviderError();
  }
};

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

const itineraryDateTime = (start: { dateTime?: string; localDate: string; localTime?: string }) =>
  start.dateTime ?? (start.localTime ? `${start.localDate}T${start.localTime}` : `${start.localDate}T12:00:00`);

const loadEvents = async (destination: string, startDate: Date, endDate: Date, apiKey: string) => {
  if (endDate < new Date()) {
    return { status: "UNAVAILABLE" as const, reason: "TRIP_ENDED" as const, message: "This trip has already ended." };
  }

  const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodingUrl.search = new URLSearchParams({ name: destination, count: "1", language: "en", format: "json" }).toString();
  const geocoding = geocodingResponseSchema.safeParse(await fetchJson(geocodingUrl));
  if (!geocoding.success) throw new EventsProviderError();
  const location = geocoding.data.results?.[0];
  if (!location) {
    return { status: "UNAVAILABLE" as const, reason: "LOCATION_NOT_FOUND" as const, message: "We could not find this destination. Try adding the city and country." };
  }

  const eventsUrl = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  eventsUrl.search = new URLSearchParams({
    apikey: apiKey,
    city: location.name,
    ...(location.country_code ? { countryCode: location.country_code } : {}),
    startDateTime: `${dateOnly(startDate)}T00:00:00Z`,
    endDateTime: `${dateOnly(endDate)}T23:59:59Z`,
    size: "40",
    sort: "date,asc",
    includeTBA: "no",
    includeTBD: "no",
  }).toString();
  const parsed = ticketmasterResponseSchema.safeParse(await fetchJson(eventsUrl));
  if (!parsed.success) throw new EventsProviderError();

  const events = (parsed.data._embedded?.events ?? []).map((event) => {
    const venue = event._embedded?.venues[0];
    const classification = event.classifications?.[0];
    const price = event.priceRanges?.[0];
    const image = [...(event.images ?? [])].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
    return {
      id: event.id,
      name: event.name,
      url: event.url,
      startDateTime: itineraryDateTime(event.dates.start),
      endDateTime: event.dates.end?.dateTime ?? null,
      status: event.dates.status?.code ?? null,
      category: classification?.segment?.name ?? "Other",
      genre: classification?.genre?.name ?? null,
      imageUrl: image?.url ?? null,
      venue: {
        name: venue?.name ?? null,
        address: venue?.address?.line1 ?? null,
        city: venue?.city?.name ?? location.name,
        country: venue?.country?.name ?? location.country ?? null,
        latitude: venue?.location?.latitude ? Number(venue.location.latitude) : null,
        longitude: venue?.location?.longitude ? Number(venue.location.longitude) : null,
      },
      price: price?.currency && (price.min !== undefined || price.max !== undefined)
        ? { minimum: price.min ?? null, maximum: price.max ?? null, currency: price.currency }
        : null,
    };
  });

  return {
    status: "AVAILABLE" as const,
    location: { name: location.name, country: location.country ?? null },
    events,
    attribution: "Event data provided by Ticketmaster",
  };
};

export const getTripEvents = async (userId: string, tripId: string) => {
  const trip = await getTrip(userId, tripId);
  if (!env.TICKETMASTER_API_KEY) {
    return { status: "NOT_CONFIGURED" as const, message: "Live event discovery needs one server setting before events can load." };
  }
  const cacheKey = `${trip.destination.trim().toLowerCase()}:${dateOnly(trip.startDate)}:${dateOnly(trip.endDate)}`;
  const cached = eventsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await loadEvents(trip.destination, trip.startDate, trip.endDate, env.TICKETMASTER_API_KEY);
  eventsCache.set(cacheKey, { expiresAt: Date.now() + CACHE_DURATION_MS, value });
  return value;
};

export const clearEventsCache = () => eventsCache.clear();
