import { useEffect, useState } from "react";

import { ApiError } from "../lib/api";
import { getTripWeather } from "./weather-api";
import type { TripWeather, WeatherDay } from "./weather-types";

type Props = { tripId: string };

const weatherLabels: Record<number, { icon: string; label: string }> = {
  0: { icon: "☀️", label: "Clear sky" },
  1: { icon: "🌤️", label: "Mainly clear" },
  2: { icon: "⛅", label: "Partly cloudy" },
  3: { icon: "☁️", label: "Overcast" },
  45: { icon: "🌫️", label: "Fog" },
  48: { icon: "🌫️", label: "Freezing fog" },
  51: { icon: "🌦️", label: "Light drizzle" },
  53: { icon: "🌦️", label: "Drizzle" },
  55: { icon: "🌧️", label: "Heavy drizzle" },
  61: { icon: "🌦️", label: "Light rain" },
  63: { icon: "🌧️", label: "Rain" },
  65: { icon: "🌧️", label: "Heavy rain" },
  71: { icon: "🌨️", label: "Light snow" },
  73: { icon: "🌨️", label: "Snow" },
  75: { icon: "❄️", label: "Heavy snow" },
  80: { icon: "🌦️", label: "Rain showers" },
  81: { icon: "🌧️", label: "Rain showers" },
  82: { icon: "⛈️", label: "Heavy showers" },
  95: { icon: "⛈️", label: "Thunderstorm" },
  96: { icon: "⛈️", label: "Thunderstorm and hail" },
  99: { icon: "⛈️", label: "Severe thunderstorm" },
};

const describeWeather = (day: WeatherDay) =>
  weatherLabels[day.weatherCode] ?? { icon: "🌡️", label: "Mixed weather" };

const formatDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export function WeatherSection({ tripId }: Props) {
  const [weather, setWeather] = useState<TripWeather | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;
    getTripWeather(tripId)
      .then((result) => {
        if (isActive) setWeather(result);
      })
      .catch((caught) => {
        if (isActive) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Weather information is temporarily unavailable.",
          );
        }
      });
    return () => { isActive = false; };
  }, [tripId]);

  return (
    <section className="weather-section" aria-labelledby="weather-heading">
      <div className="itinerary-heading">
        <div>
          <p className="eyebrow">Destination weather</p>
          <h2 id="weather-heading">Plan for the conditions.</h2>
          <p>Forecasts appear when your trip is within the next 16 days.</p>
        </div>
      </div>

      {error ? <div className="weather-message weather-error" role="status">{error}</div> : null}
      {!error && !weather ? <div className="weather-message">Loading destination weather…</div> : null}
      {weather?.status === "UNAVAILABLE" ? (
        <div className="weather-message">
          <strong>Forecast not available yet</strong>
          <p>{weather.message}</p>
          {weather.forecastAvailableFrom ? <small>Check again from {formatDay(weather.forecastAvailableFrom)}.</small> : null}
        </div>
      ) : null}
      {weather?.status === "AVAILABLE" ? (
        <>
          <div className="weather-location">
            <strong>{weather.location.name}{weather.location.country ? `, ${weather.location.country}` : ""}</strong>
            {weather.forecast.isPartial ? <span>Partial forecast—more days will appear closer to departure.</span> : null}
          </div>
          <div className="weather-grid">
            {weather.days.map((day) => {
              const condition = describeWeather(day);
              return (
                <article className="weather-card" key={day.date}>
                  <strong>{formatDay(day.date)}</strong>
                  <span className="weather-icon" aria-hidden="true">{condition.icon}</span>
                  <span>{condition.label}</span>
                  <div className="weather-temperatures"><strong>{Math.round(day.temperatureMaxC)}°</strong><span>{Math.round(day.temperatureMinC)}°C</span></div>
                  <small>{day.precipitationProbability}% rain · wind {Math.round(day.windSpeedMaxKph)} km/h</small>
                </article>
              );
            })}
          </div>
          <small className="weather-attribution">{weather.attribution}</small>
        </>
      ) : null}
    </section>
  );
}
