import { apiRequest } from "../lib/api";
import type { TripPlaces } from "./place-types";

export const getTripPlaces = async (tripId: string) => {
  const response = await apiRequest<{ data: { places: TripPlaces } }>(
    `/trips/${tripId}/places`,
  );
  return response.data.places;
};
