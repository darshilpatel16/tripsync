import { useEffect, useState } from "react";
import { Link } from "react-router";

import { WorkspaceShell } from "../components/WorkspaceShell";
import { DestinationArt } from "../components/DestinationArt";
import { destinationTheme } from "../components/destination-theme";
import { ApiError } from "../lib/api";
import { listTrips } from "../trips/trip-api";
import type { TripSummary } from "../trips/trip-types";

const formatDates = (startDate: string, endDate: string) => {
  // Dates are stored as UTC values; fixing the formatter to UTC prevents them
  // moving by one day for users in a different time zone.
  const formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${formatter.format(new Date(startDate))} – ${formatter.format(new Date(endDate))}`;
};

export function TripsPage() {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Ignore a late API response if the user leaves the page while it loads.
    let active = true;
    listTrips().then((items) => { if (active) { setTrips(items); setStatus("ready"); } }).catch((error) => {
      if (active) { setMessage(error instanceof ApiError ? error.message : "TripSync could not load your trips."); setStatus("error"); }
    });
    return () => { active = false; };
  }, []);

  return <WorkspaceShell>
    <section className="workspace-page trips-page">
      <div className="workspace-page-heading">
        <div><p className="eyebrow">Your travel notes</p><h1>Trips</h1><p>Choose a trip to see its details or open its dedicated planning pages.</p></div>
        <Link className="primary-action" to="/trips/new">Create trip</Link>
      </div>
      {status === "loading" ? <p className="status-message">Loading your trips…</p> : null}
      {status === "error" ? <p className="form-message form-message-error" role="alert">{message}</p> : null}
      {status === "ready" && trips.length === 0 ? <div className="empty-state"><h2>No trips yet.</h2><p>Create your first trip to begin planning.</p></div> : null}
      {/* Each card derives its artwork from the destination without changing the trip record. */}
      {status === "ready" && trips.length > 0 ? <div className="trip-notes-grid">
        {trips.map((trip) => <Link className={`trip-note trip-note-${destinationTheme(trip.destination).key}`} key={trip.id} to={`/trips/${trip.id}`}>
          <DestinationArt compact destination={trip.destination} />
          <div className="trip-note-top"><span>{trip.role === "OWNER" ? "Organising" : "Member"}</span><span>{trip.currency}</span></div>
          <h2>{trip.name}</h2><strong>{trip.destination}</strong><p>{formatDates(trip.startDate, trip.endDate)}</p>
          <p>{trip.memberCount} {trip.memberCount === 1 ? "traveller" : "travellers"}</p>
        </Link>)}
      </div> : null}
    </section>
  </WorkspaceShell>;
}
