import { apiRequest } from "../lib/api";
import type { TripWeather } from "./weather-types";

export const getTripWeather = async (tripId: string) => {
  const response = await apiRequest<{ data: { weather: TripWeather } }>(
    `/trips/${tripId}/weather`,
  );
  return response.data.weather;
};
