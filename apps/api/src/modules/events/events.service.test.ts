import "dotenv/config";

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { registerUser } from "../auth/auth.service.js";
import { createTrip } from "../trips/trip.service.js";
import { clearEventsCache, EventsProviderError, getTripEvents } from "./events.service.js";

const email = "events-user@tripsync.test";
const originalApiKey = env.TICKETMASTER_API_KEY;
let userId: string;

const cleanTestData = async () => {
  await prisma.trip.deleteMany({ where: { createdBy: { email } } });
  await prisma.user.deleteMany({ where: { email } });
};

beforeEach(async () => {
  clearEventsCache();
  env.TICKETMASTER_API_KEY = "test-key";
  await cleanTestData();
  userId = (await registerUser({ displayName: "Events User", email, password: "correct horse battery staple" })).id;
});

afterEach(async () => {
  vi.unstubAllGlobals();
  clearEventsCache();
  env.TICKETMASTER_API_KEY = originalApiKey;
  await cleanTestData();
});

afterAll(async () => prisma.$disconnect());

const createFutureTrip = () => createTrip(userId, {
  name: "London live",
  destination: "London, United Kingdom",
  startDate: "2027-09-10",
  endDate: "2027-09-12",
  currency: "GBP",
  budgetMinor: null,
});

describe("trip events service", () => {
  it("normalises real events and caches the result", async () => {
    const trip = await createFutureTrip();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ name: "London", country: "United Kingdom", country_code: "GB" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ _embedded: { events: [{
        id: "event-1", name: "Live in London", url: "https://example.com/tickets",
        dates: { start: { dateTime: "2027-09-11T18:30:00Z", localDate: "2027-09-11" }, status: { code: "onsale" } },
        images: [{ url: "https://example.com/event.jpg", width: 1024, ratio: "16_9" }],
        classifications: [{ segment: { name: "Music" }, genre: { name: "Rock" } }],
        priceRanges: [{ min: 25, max: 70, currency: "GBP" }],
        _embedded: { venues: [{ name: "The Roundhouse", city: { name: "London" }, country: { name: "United Kingdom" }, address: { line1: "Chalk Farm Road" }, location: { latitude: "51.543", longitude: "-0.151" } }] },
      }] } })));
    vi.stubGlobal("fetch", fetchMock);

    const first = await getTripEvents(userId, trip.id);
    const second = await getTripEvents(userId, trip.id);

    expect(first).toMatchObject({ status: "AVAILABLE", location: { name: "London" }, events: [{ name: "Live in London", category: "Music", genre: "Rock", venue: { name: "The Roundhouse" }, price: { minimum: 25, currency: "GBP" } }] });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("countryCode=GB");
  });

  it("returns a setup state when no API key is configured", async () => {
    const trip = await createFutureTrip();
    env.TICKETMASTER_API_KEY = undefined;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(getTripEvents(userId, trip.id)).resolves.toMatchObject({ status: "NOT_CONFIGURED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a safe error when a provider fails", async () => {
    const trip = await createFutureTrip();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    await expect(getTripEvents(userId, trip.id)).rejects.toBeInstanceOf(EventsProviderError);
  });
});
