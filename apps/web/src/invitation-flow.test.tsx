import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "./auth/auth-context";
import { InvitationPage } from "./pages/InvitationPage";
import { TripOverviewPage } from "./pages/TripOverviewPage";
import * as tripApi from "./trips/trip-api";

vi.mock("./trips/trip-api");
vi.mock("./activities/ActivitySection", () => ({ ActivitySection: () => null }));
vi.mock("./expenses/ExpenseSection", () => ({ ExpenseSection: () => null }));
vi.mock("./weather/WeatherSection", () => ({ WeatherSection: () => null }));
vi.mock("./places/PlaceDiscoverySection", () => ({ PlaceDiscoverySection: () => null }));
vi.mock("./events/EventDiscoverySection", () => ({ EventDiscoverySection: () => null }));
vi.mock("./transport/TransportPlannerSection", () => ({ TransportPlannerSection: () => null }));

const user = {
  id: "22222222-2222-4222-8222-222222222222",
  displayName: "Invited Traveller",
  email: "traveller@example.com",
  createdAt: "2026-07-31T00:00:00.000Z",
};

const authValue = {
  user,
  status: "authenticated" as const,
  login: vi.fn(),
  logout: vi.fn(),
};

const trip = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Summer in Italy",
  destination: "Rome, Italy",
  startDate: "2026-09-10T00:00:00.000Z",
  endDate: "2026-09-17T00:00:00.000Z",
  currency: "EUR",
  budgetMinor: null,
  role: "OWNER" as const,
  memberCount: 1,
  createdAt: "2026-07-31T00:00:00.000Z",
  updatedAt: "2026-07-31T00:00:00.000Z",
  members: [
    {
      role: "OWNER" as const,
      joinedAt: "2026-07-31T00:00:00.000Z",
      user: {
        id: "33333333-3333-4333-8333-333333333333",
        displayName: "Trip Owner",
        email: "owner@example.com",
      },
    },
  ],
};

const invitation = {
  id: "44444444-4444-4444-8444-444444444444",
  email: user.email,
  status: "PENDING" as const,
  expiresAt: "2026-08-07T00:00:00.000Z",
  createdAt: "2026-07-31T00:00:00.000Z",
  trip: {
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
  },
  invitedBy: { id: trip.members[0].user.id, displayName: "Trip Owner" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("invitation frontend flow", () => {
  it("lets the owner create a secure invitation", async () => {
    vi.mocked(tripApi.getTrip).mockResolvedValue(trip);
    vi.mocked(tripApi.listTripInvitations).mockResolvedValue([]);
    vi.mocked(tripApi.createTripInvitation).mockResolvedValue({
      invitation,
      invitationUrl: "http://localhost:5173/invitations/secure-token",
      emailDelivery: "DEVELOPMENT",
    });

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[`/trips/${trip.id}`]}>
          <Routes>
            <Route path="/trips/:tripId" element={<TripOverviewPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    fireEvent.change(await screen.findByLabelText(/email address/i), {
      target: { value: user.email },
    });
    fireEvent.click(screen.getByRole("button", { name: /send invitation/i }));

    expect(await screen.findByDisplayValue(/secure-token/)).toBeInTheDocument();
    expect(tripApi.createTripInvitation).toHaveBeenCalledWith(trip.id, user.email);
  });

  it("lets the matching signed-in user accept the invitation", async () => {
    vi.mocked(tripApi.getInvitation).mockResolvedValue(invitation);
    vi.mocked(tripApi.acceptInvitation).mockResolvedValue({
      tripId: trip.id,
      status: "ACCEPTED",
    });

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/invitations/secure-token"]}>
          <Routes>
            <Route path="/invitations/:token" element={<InvitationPage />} />
            <Route path="/trips/:tripId" element={<h1>Accepted trip opened</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /accept invitation/i }));

    await waitFor(() => {
      expect(tripApi.acceptInvitation).toHaveBeenCalledWith("secure-token");
      expect(screen.getByRole("heading", { name: /accepted trip opened/i })).toBeInTheDocument();
    });
  });
});
