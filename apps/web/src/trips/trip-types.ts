export type TripRole = "OWNER" | "MEMBER";

export type TripSummary = {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
  role: TripRole;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TripMember = {
  role: TripRole;
  joinedAt: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
};

export type TripDetail = TripSummary & {
  members: TripMember[];
};

export type CreateTripInput = {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
};
