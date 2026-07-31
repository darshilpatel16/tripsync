import { useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../auth/useAuth";

export function DashboardPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav">
        <span className="brand">TripSync</span>
        <button
          className="secondary-button"
          disabled={isLoggingOut}
          onClick={handleLogout}
          type="button"
        >
          {isLoggingOut ? "Signing out…" : "Sign out"}
        </button>
      </nav>

      <section className="dashboard-content">
        <p className="eyebrow">Your dashboard</p>
        <h1>Welcome, {user?.displayName}.</h1>
        <div className="empty-state">
          <h2>Your trips will live here.</h2>
          <p>
            Authentication is complete. Creating and listing trips begins in
            Milestone 2.
          </p>
          <button disabled type="button">
            Create trip — coming next
          </button>
        </div>
      </section>
    </main>
  );
}
