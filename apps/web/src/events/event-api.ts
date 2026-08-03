import { apiRequest } from "../lib/api";
import type { TripEvents } from "./event-types";

export const getTripEvents = async (tripId: string) => {
  const response = await apiRequest<{ data: { events: TripEvents } }>(`/trips/${tripId}/events`);
  return response.data.events;
};
