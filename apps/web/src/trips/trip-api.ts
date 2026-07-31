import { apiRequest } from "../lib/api";
import type { CreateTripInput, TripDetail, TripSummary } from "./trip-types";

export const listTrips = async () => {
  const response = await apiRequest<{ data: { trips: TripSummary[] } }>(
    "/trips",
  );
  return response.data.trips;
};

export const createTrip = async (input: CreateTripInput) => {
  const response = await apiRequest<{ data: { trip: TripSummary } }>(
    "/trips",
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.data.trip;
};

export const getTrip = async (tripId: string) => {
  const response = await apiRequest<{ data: { trip: TripDetail } }>(
    `/trips/${tripId}`,
  );
  return response.data.trip;
};

export const deleteTrip = (tripId: string) =>
  apiRequest<void>(`/trips/${tripId}`, { method: "DELETE" });
