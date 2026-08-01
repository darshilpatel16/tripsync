import "dotenv/config";

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "../../lib/prisma.js";
import { registerUser } from "../auth/auth.service.js";
import { createTrip } from "../trips/trip.service.js";
import { getTripWeather, WeatherProviderError } from "./weather.service.js";

const email = "weather-user@tripsync.test";
let userId: string;

const isoDateFromToday = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const cleanTestData = async () => {
  await prisma.trip.deleteMany({ where: { createdBy: { email } } });
  await prisma.user.deleteMany({ where: { email } });
};

beforeEach(async () => {
  await cleanTestData();
  const user = await registerUser({
    displayName: "Weather User",
    email,
    password: "correct horse battery staple",
  });
  userId = user.id;
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await cleanTestData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("trip weather service", () => {
  it("returns daily weather for an upcoming trip", async () => {
    const startDate = isoDateFromToday(2);
    const endDate = isoDateFromToday(3);
    const trip = await createTrip(userId, {
      name: "Rome weekend",
      destination: "Rome, Italy",
      startDate,
      endDate,
      currency: "EUR",
      budgetMinor: null,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [{ name: "Rome", latitude: 41.89193, longitude: 12.51133, country: "Italy", admin1: "Lazio" }],
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        timezone: "Europe/Rome",
        daily: {
          time: [startDate, endDate],
          weather_code: [1, 61],
          temperature_2m_max: [26, 23],
          temperature_2m_min: [17, 16],
          precipitation_probability_max: [10, 65],
          wind_speed_10m_max: [12, 18],
        },
      })));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getTripWeather(userId, trip.id);

    expect(result).toMatchObject({
      status: "AVAILABLE",
      location: { name: "Rome", country: "Italy" },
      forecast: { isPartial: false },
      days: [{ date: startDate, weatherCode: 1 }, { date: endDate, weatherCode: 61 }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not call the provider when the trip is too far away", async () => {
    const trip = await createTrip(userId, {
      name: "Future trip",
      destination: "Tokyo, Japan",
      startDate: isoDateFromToday(40),
      endDate: isoDateFromToday(45),
      currency: "JPY",
      budgetMinor: null,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTripWeather(userId, trip.id)).resolves.toMatchObject({
      status: "UNAVAILABLE",
      reason: "TOO_EARLY",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("turns provider failures into a safe application error", async () => {
    const trip = await createTrip(userId, {
      name: "Provider test",
      destination: "Paris, France",
      startDate: isoDateFromToday(1),
      endDate: isoDateFromToday(2),
      currency: "EUR",
      budgetMinor: null,
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    await expect(getTripWeather(userId, trip.id)).rejects.toBeInstanceOf(
      WeatherProviderError,
    );
  });
});
