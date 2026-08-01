import "dotenv/config";

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../../lib/prisma.js";
import { registerUser } from "../auth/auth.service.js";
import { createTrip } from "../trips/trip.service.js";
import { clearPlacesCache, getTripPlaces, PlacesProviderError } from "./places.service.js";

const email = "places-user@tripsync.test";
let userId: string;

const cleanTestData = async () => {
  await prisma.trip.deleteMany({ where: { createdBy: { email } } });
  await prisma.user.deleteMany({ where: { email } });
};

beforeEach(async () => {
  clearPlacesCache();
  await cleanTestData();
  userId = (await registerUser({
    displayName: "Places User",
    email,
    password: "correct horse battery staple",
  })).id;
});

afterEach(async () => {
  vi.unstubAllGlobals();
  clearPlacesCache();
  await cleanTestData();
});

afterAll(async () => prisma.$disconnect());

describe("trip places service", () => {
  it("normalises nearby restaurants and attractions and caches the result", async () => {
    const trip = await createTrip(userId, {
      name: "Rome discoveries",
      destination: "Rome, Italy",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
      currency: "EUR",
      budgetMinor: null,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [{ name: "Rome", latitude: 41.9, longitude: 12.5, country: "Italy", admin1: "Lazio" }],
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        elements: [
          { type: "node", id: 1, lat: 41.91, lon: 12.51, tags: { name: "Pasta House", amenity: "restaurant", cuisine: "italian", "addr:street": "Via Roma" } },
          { type: "way", id: 2, center: { lat: 41.92, lon: 12.52 }, tags: { name: "City Museum", tourism: "museum" } },
        ],
      })));
    vi.stubGlobal("fetch", fetchMock);

    const first = await getTripPlaces(userId, trip.id);
    const second = await getTripPlaces(userId, trip.id);

    expect(first).toMatchObject({
      status: "AVAILABLE",
      location: { name: "Rome", country: "Italy" },
      places: [
        { name: "City Museum", category: "MUSEUM" },
        { name: "Pasta House", category: "RESTAURANT", cuisine: "italian" },
      ],
    });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a safe error when a provider fails", async () => {
    const trip = await createTrip(userId, {
      name: "Provider failure",
      destination: "Paris, France",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
      currency: "EUR",
      budgetMinor: null,
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(getTripPlaces(userId, trip.id)).rejects.toBeInstanceOf(
      PlacesProviderError,
    );
  });
});
