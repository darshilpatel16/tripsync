import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "./useAuth";

export function ProtectedRoute() {
  const location = useLocation();
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <main className="status-page" aria-live="polite">
        <p>Checking your TripSync session…</p>
      </main>
    );
  }

  if (status === "guest") {
    return (
      <Navigate
        replace
        state={{ returnTo: location.pathname }}
        to="/login"
      />
    );
  }

  return <Outlet />;
}
