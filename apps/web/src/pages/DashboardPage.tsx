import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { useAuth } from "../auth/useAuth";
import { ApiError } from "../lib/api";
import { listTrips } from "../trips/trip-api";
import type { TripSummary } from "../trips/trip-types";

const formatTripDates = (startDate: string, endDate: string) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${formatter.format(new Date(startDate))} – ${formatter.format(new Date(endDate))}`;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isActive = true;
    listTrips()
      .then((result) => {
        if (isActive) {
          setTrips(result);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "TripSync could not load your trips.",
          );
          setStatus("error");
        }
      });
    return () => { isActive = false; };
  }, []);

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
        <Link className="brand" to="/dashboard">TripSync</Link>
        <button className="secondary-button" disabled={isLoggingOut} onClick={handleLogout} type="button">
          {isLoggingOut ? "Signing out…" : "Sign out"}
        </button>
      </nav>

      <section className="dashboard-content">
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">Your dashboard</p>
            <h1>Welcome, {user?.displayName}.</h1>
          </div>
          <Link className="primary-action" to="/trips/new">Create trip</Link>
        </div>

        {status === "loading" ? <p className="status-message">Loading your trips…</p> : null}
        {status === "error" ? <div className="form-message form-message-error" role="alert">{errorMessage}</div> : null}

        {status === "ready" && trips.length === 0 ? (
          <div className="empty-state">
            <h2>Your next trip starts here.</h2>
            <p>Create one shared space for your destination, dates, group plans and expenses.</p>
            <Link className="primary-action" to="/trips/new">Create your first trip</Link>
          </div>
        ) : null}

        {status === "ready" && trips.length > 0 ? (
          <div className="trip-grid">
            {trips.map((trip) => (
              <Link className="trip-card" key={trip.id} to={`/trips/${trip.id}`}>
                <div className="trip-card-topline">
                  <span>{trip.role === "OWNER" ? "Organising" : "Member"}</span>
                  <span>{trip.currency}</span>
                </div>
                <h2>{trip.name}</h2>
                <p className="trip-destination">{trip.destination}</p>
                <p>{formatTripDates(trip.startDate, trip.endDate)}</p>
                <p>{trip.memberCount} {trip.memberCount === 1 ? "traveller" : "travellers"}</p>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
