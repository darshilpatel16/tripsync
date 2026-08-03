import { apiRequest } from "../lib/api";
import type { RouteResult, TransportMode } from "./transport-types";

export const planRoute = async (tripId: string, input: { from: string; to: string; mode: TransportMode }) => {
  const response = await apiRequest<{ data: { route: RouteResult } }>(`/trips/${tripId}/transport/route`, { method: "POST", body: JSON.stringify(input) });
  return response.data.route;
};
