import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "./auth/auth-context";
import type { AuthContextValue } from "./auth/auth-types";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";

const user = {
  id: "user-1",
  displayName: "Darshil Test",
  email: "darshil@example.com",
  createdAt: "2026-07-31T00:00:00.000Z",
};

const renderWithAuth = (
  value: AuthContextValue,
  initialEntry: string,
  routes: React.ReactNode,
) =>
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>{routes}</Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe("authentication pages", () => {
  it("signs in and sends the user to the dashboard", async () => {
    const login = vi.fn().mockResolvedValue(user);

    renderWithAuth(
      { user: null, status: "guest", login, logout: vi.fn() },
      "/login",
      <>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<h1>Dashboard reached</h1>} />
      </>,
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "correct horse battery staple" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith(
        user.email,
        "correct horse battery staple",
      );
      expect(
        screen.getByRole("heading", { name: /dashboard reached/i }),
      ).toBeInTheDocument();
    });
  });

  it("redirects a guest away from a protected page", () => {
    renderWithAuth(
      { user: null, status: "guest", login: vi.fn(), logout: vi.fn() },
      "/dashboard",
      <>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<h1>Private dashboard</h1>} />
        </Route>
        <Route path="/login" element={<h1>Sign in required</h1>} />
      </>,
    );

    expect(
      screen.getByRole("heading", { name: /sign in required/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/private dashboard/i)).not.toBeInTheDocument();
  });
});
