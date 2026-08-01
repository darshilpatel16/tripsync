export type TripRole = "OWNER" | "MEMBER";

export type TripSummary = {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
  budgetMinor: number | null;
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
    avatarDataUrl?: string | null;
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
  budgetMinor?: number | null;
};

export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export type TripInvitation = {
  id: string;
  email: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
};

export type InvitationDetail = TripInvitation & {
  trip: {
    id: string;
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
  };
  invitedBy: {
    id: string;
    displayName: string;
  };
};

export type EmailDelivery = "SENT" | "DEVELOPMENT" | "FAILED";
