import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WeatherSection } from "./weather/WeatherSection";
import * as weatherApi from "./weather/weather-api";

vi.mock("./weather/weather-api");

beforeEach(() => vi.clearAllMocks());

describe("weather frontend flow", () => {
  it("shows daily forecast cards", async () => {
    vi.mocked(weatherApi.getTripWeather).mockResolvedValue({
      status: "AVAILABLE",
      location: { name: "Rome", region: "Lazio", country: "Italy", latitude: 41.9, longitude: 12.5, timezone: "Europe/Rome" },
      forecast: { startDate: "2026-08-03", endDate: "2026-08-03", isPartial: false },
      days: [{ date: "2026-08-03", weatherCode: 1, temperatureMaxC: 27, temperatureMinC: 18, precipitationProbability: 10, windSpeedMaxKph: 12 }],
      attribution: "Weather data by Open-Meteo.com",
    });

    render(<WeatherSection tripId="11111111-1111-4111-8111-111111111111" />);

    expect(await screen.findByText("Rome, Italy")).toBeInTheDocument();
    expect(screen.getByText("Mainly clear")).toBeInTheDocument();
    expect(screen.getByText(/10% rain/i)).toBeInTheDocument();
  });

  it("explains when the trip is too far away", async () => {
    vi.mocked(weatherApi.getTripWeather).mockResolvedValue({
      status: "UNAVAILABLE",
      reason: "TOO_EARLY",
      message: "A reliable forecast will appear 16 days before your trip begins.",
      forecastAvailableFrom: "2026-08-20",
    });

    render(<WeatherSection tripId="11111111-1111-4111-8111-111111111111" />);

    expect(await screen.findByText(/forecast not available yet/i)).toBeInTheDocument();
    expect(screen.getByText(/16 days before/i)).toBeInTheDocument();
  });
});
