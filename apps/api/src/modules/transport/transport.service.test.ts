import "dotenv/config";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { registerUser } from "../auth/auth.service.js";
import { createTrip } from "../trips/trip.service.js";
import { planTripRoute, TransportProviderError } from "./transport.service.js";

const email = "transport-user@tripsync.test";
const originalKey = env.OPENROUTESERVICE_API_KEY;
let userId: string;
let tripId: string;

const clean = async () => { await prisma.trip.deleteMany({ where: { createdBy: { email } } }); await prisma.user.deleteMany({ where: { email } }); };
beforeEach(async () => {
  env.OPENROUTESERVICE_API_KEY = "test-key";
  await clean();
  userId = (await registerUser({ displayName: "Transport User", email, password: "correct horse battery staple" })).id;
  tripId = (await createTrip(userId, { name: "London routes", destination: "London", startDate: "2027-09-10", endDate: "2027-09-12", currency: "GBP", budgetMinor: null })).id;
});
afterEach(async () => { vi.unstubAllGlobals(); env.OPENROUTESERVICE_API_KEY = originalKey; await clean(); });
afterAll(async () => prisma.$disconnect());

describe("transport service", () => {
  it("geocodes two locations and normalises a walking route", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ name: "Tower Bridge", latitude: 51.5055, longitude: -0.0754, country: "United Kingdom" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ name: "British Museum", latitude: 51.5194, longitude: -0.127, country: "United Kingdom" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ features: [{ geometry: { type: "LineString", coordinates: [[-0.0754, 51.5055], [-0.127, 51.5194]] }, properties: { summary: { distance: 5200, duration: 3900 }, segments: [{ steps: [{ instruction: "Head west", distance: 400, duration: 300, name: "Tooley Street" }] }] } }] })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await planTripRoute(userId, tripId, { from: "Tower Bridge", to: "British Museum", mode: "WALKING" });
    expect(result).toMatchObject({ status: "AVAILABLE", mode: "WALKING", distanceMetres: 5200, durationSeconds: 3900, steps: [{ instruction: "Head west" }] });
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("foot-walking");
  });

  it("returns a setup state without a routing key", async () => {
    env.OPENROUTESERVICE_API_KEY = undefined;
    await expect(planTripRoute(userId, tripId, { from: "A", to: "B", mode: "DRIVING" })).resolves.toMatchObject({ status: "NOT_CONFIGURED" });
  });

  it("returns a safe provider error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    await expect(planTripRoute(userId, tripId, { from: "London", to: "Oxford", mode: "DRIVING" })).rejects.toBeInstanceOf(TransportProviderError);
  });
});
