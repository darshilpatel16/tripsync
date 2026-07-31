import { apiRequest } from "../lib/api";
import type {
  CreateTripInput,
  EmailDelivery,
  InvitationDetail,
  InvitationStatus,
  TripDetail,
  TripInvitation,
  TripSummary,
} from "./trip-types";

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

export const createTripInvitation = async (tripId: string, email: string) => {
  const response = await apiRequest<{
    data: {
      invitation: InvitationDetail;
      invitationUrl: string;
      emailDelivery: EmailDelivery;
    };
  }>(`/trips/${tripId}/invitations`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return response.data;
};

export const listTripInvitations = async (tripId: string) => {
  const response = await apiRequest<{ data: { invitations: TripInvitation[] } }>(
    `/trips/${tripId}/invitations`,
  );
  return response.data.invitations;
};

export const getInvitation = async (token: string) => {
  const response = await apiRequest<{ data: { invitation: InvitationDetail } }>(
    `/invitations/${encodeURIComponent(token)}`,
  );
  return response.data.invitation;
};

const respondToInvitation = async (
  token: string,
  decision: "accept" | "decline",
) => {
  const response = await apiRequest<{
    data: { tripId: string; status: InvitationStatus };
  }>(`/invitations/${encodeURIComponent(token)}/${decision}`, { method: "POST" });
  return response.data;
};

export const acceptInvitation = (token: string) =>
  respondToInvitation(token, "accept");

export const declineInvitation = (token: string) =>
  respondToInvitation(token, "decline");

export const removeTripMember = (tripId: string, userId: string) =>
  apiRequest<void>(`/trips/${tripId}/members/${userId}`, { method: "DELETE" });

export const leaveTrip = (tripId: string) =>
  apiRequest<void>(`/trips/${tripId}/leave`, { method: "POST" });
