import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "./auth/auth-context";
import { CreateTripPage } from "./pages/CreateTripPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EditTripPage } from "./pages/EditTripPage";
import { TripsPage } from "./pages/TripsPage";
import * as tripApi from "./trips/trip-api";

vi.mock("./trips/trip-api");

const authValue = {
  user: {
    id: "user-1",
    displayName: "Darshil Test",
    email: "darshil@example.com",
    createdAt: "2026-07-31T00:00:00.000Z",
  },
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
  budgetMinor: 150000,
  role: "OWNER" as const,
  memberCount: 1,
  createdAt: "2026-07-31T00:00:00.000Z",
  updatedAt: "2026-07-31T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(tripApi.listMyInvitations).mockResolvedValue([]);
});

describe("trip frontend flow", () => {
  it("shows the signed-in user's trips on the dedicated trips page", async () => {
    vi.mocked(tripApi.listTrips).mockResolvedValue([trip]);

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/trips"]}>
          <TripsPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(await screen.findByRole("heading", { name: trip.name })).toBeInTheDocument();
    expect(screen.getByText(trip.destination)).toBeInTheDocument();
    expect(screen.getByText(/1 traveller/i)).toBeInTheDocument();
  });

  it("creates a trip and opens its overview", async () => {
    vi.mocked(tripApi.createTrip).mockResolvedValue(trip);

    render(
      <MemoryRouter initialEntries={["/trips/new"]}>
        <Routes>
          <Route path="/trips/new" element={<CreateTripPage />} />
          <Route path="/trips/:tripId" element={<h1>Trip overview reached</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/trip name/i), { target: { value: trip.name } });
    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: trip.destination } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: "2026-09-10" } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: "2026-09-17" } });
    fireEvent.change(screen.getByLabelText(/main currency/i), { target: { value: "EUR" } });
    fireEvent.change(screen.getByLabelText(/total trip budget/i), { target: { value: "1500.00" } });
    fireEvent.click(screen.getByRole("button", { name: /^create trip$/i }));

    await waitFor(() => {
      expect(tripApi.createTrip).toHaveBeenCalledWith({
        name: trip.name,
        destination: trip.destination,
        startDate: "2026-09-10",
        endDate: "2026-09-17",
        currency: "EUR",
        budgetMinor: 150000,
      });
      expect(screen.getByRole("heading", { name: /trip overview reached/i })).toBeInTheDocument();
    });
  });

  it("prefills and updates a trip for its owner", async () => {
    vi.mocked(tripApi.getTrip).mockResolvedValue({ ...trip, members: [] });
    vi.mocked(tripApi.updateTrip).mockResolvedValue({
      ...trip,
      name: "Italian Adventure",
    });

    render(
      <MemoryRouter initialEntries={[`/trips/${trip.id}/edit`]}>
        <Routes>
          <Route path="/trips/:tripId/edit" element={<EditTripPage />} />
          <Route path="/trips/:tripId" element={<h1>Updated trip opened</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    const nameInput = await screen.findByLabelText(/trip name/i);
    expect(nameInput).toHaveValue(trip.name);
    expect(screen.getByLabelText(/destination/i)).toHaveValue(trip.destination);
    expect(screen.getByLabelText(/start date/i)).toHaveValue("2026-09-10");

    fireEvent.change(nameInput, { target: { value: "Italian Adventure" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(tripApi.updateTrip).toHaveBeenCalledWith(trip.id, {
        name: "Italian Adventure",
        destination: trip.destination,
        startDate: "2026-09-10",
        endDate: "2026-09-17",
        currency: "EUR",
        budgetMinor: 150000,
      });
      expect(screen.getByRole("heading", { name: /updated trip opened/i })).toBeInTheDocument();
    });
  });

  it("uses the dashboard to explain TripSync and links to the real trips page", () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <DashboardPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: /one place for every part/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /what is tripsync for/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Trips" }).some((link) => link.getAttribute("href") === "/trips")).toBe(true);
  });

  it("lets an invited friend accept a request directly from the dashboard", async () => {
    const invitation = {
      id: "22222222-2222-4222-8222-222222222222",
      email: authValue.user.email,
      status: "PENDING" as const,
      expiresAt: "2026-09-01T00:00:00.000Z",
      createdAt: "2026-08-01T00:00:00.000Z",
      trip,
      invitedBy: { id: "owner-1", displayName: "Olivia Chen" },
    };
    vi.mocked(tripApi.listMyInvitations).mockResolvedValue([invitation]);
    vi.mocked(tripApi.acceptDashboardInvitation).mockResolvedValue({ tripId: trip.id, status: "ACCEPTED" });

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/trips/:tripId" element={<h1>Invited trip opened</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(await screen.findByRole("heading", { name: `You’re invited to ${trip.name}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /accept and view trip/i }));

    await waitFor(() => {
      expect(tripApi.acceptDashboardInvitation).toHaveBeenCalledWith(invitation.id);
      expect(screen.getByRole("heading", { name: /invited trip opened/i })).toBeInTheDocument();
    });
  });
});
