import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "./auth/auth-context";
import { CreateTripPage } from "./pages/CreateTripPage";
import { DashboardPage } from "./pages/DashboardPage";
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
  role: "OWNER" as const,
  memberCount: 1,
  createdAt: "2026-07-31T00:00:00.000Z",
  updatedAt: "2026-07-31T00:00:00.000Z",
};

describe("trip frontend flow", () => {
  it("shows the signed-in user's trips on the dashboard", async () => {
    vi.mocked(tripApi.listTrips).mockResolvedValue([trip]);

    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <DashboardPage />
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
    fireEvent.click(screen.getByRole("button", { name: /^create trip$/i }));

    await waitFor(() => {
      expect(tripApi.createTrip).toHaveBeenCalledWith({
        name: trip.name,
        destination: trip.destination,
        startDate: "2026-09-10",
        endDate: "2026-09-17",
        currency: "EUR",
      });
      expect(screen.getByRole("heading", { name: /trip overview reached/i })).toBeInTheDocument();
    });
  });
});
