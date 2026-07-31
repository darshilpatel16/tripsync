import type { TripRole } from "../trips/trip-types";

export type ActivityStatus = "PROPOSED" | "CONFIRMED" | "CANCELLED";

export type Activity = {
  id: string;
  tripId: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: ActivityStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    displayName: string;
  };
};

export type ActivityInput = {
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export type ActivitySectionProps = {
  tripId: string;
  tripRole: TripRole;
  currentUserId: string;
};
