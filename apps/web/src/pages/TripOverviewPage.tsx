import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { ApiError } from "../lib/api";
import { deleteTrip, getTrip } from "../trips/trip-api";
import type { TripDetail } from "../trips/trip-types";

export function TripOverviewPage() {
  const { tripId = "" } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isActive = true;
    getTrip(tripId)
      .then((result) => { if (isActive) setTrip(result); })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(error instanceof ApiError ? error.message : "TripSync could not load this trip.");
        }
      });
    return () => { isActive = false; };
  }, [tripId]);

  const handleDelete = async () => {
    if (!trip || !window.confirm(`Delete “${trip.name}”? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await deleteTrip(trip.id);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "TripSync could not delete this trip.");
      setIsDeleting(false);
    }
  };

  if (errorMessage) {
    return <main className="status-page"><div><p className="form-message form-message-error">{errorMessage}</p><Link to="/dashboard">Back to dashboard</Link></div></main>;
  }
  if (!trip) return <main className="status-page"><p>Loading trip…</p></main>;

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav">
        <Link className="brand" to="/dashboard">TripSync</Link>
        <Link className="nav-link" to="/dashboard">All trips</Link>
      </nav>
      <section className="trip-overview">
        <div className="trip-hero">
          <p className="eyebrow">{trip.role === "OWNER" ? "You are organising" : "Group trip"}</p>
          <h1>{trip.name}</h1>
          <p className="lede">{trip.destination}</p>
          <div className="trip-facts">
            <span>{new Date(trip.startDate).toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "UTC" })}</span>
            <span>to</span>
            <span>{new Date(trip.endDate).toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "UTC" })}</span>
            <span>·</span>
            <span>{trip.currency}</span>
          </div>
        </div>

        <div className="overview-grid">
          <section className="overview-card">
            <p className="eyebrow">Travellers</p>
            <h2>{trip.memberCount} in this trip</h2>
            <div className="member-list">
              {trip.members.map((member) => (
                <div className="member-row" key={member.user.id}>
                  <div><strong>{member.user.displayName}</strong><span>{member.user.email}</span></div>
                  <span>{member.role === "OWNER" ? "Owner" : "Member"}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="overview-card muted-card">
            <p className="eyebrow">Coming next</p>
            <h2>Plan together.</h2>
            <p>Invitations arrive later in this milestone. Activities and voting arrive in Milestone 3.</p>
          </section>
        </div>

        {trip.role === "OWNER" ? (
          <div className="danger-zone">
            <div><strong>Delete trip</strong><p>Permanently remove this trip and its shared information.</p></div>
            <button className="danger-button" disabled={isDeleting} onClick={handleDelete} type="button">{isDeleting ? "Deleting…" : "Delete trip"}</button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
