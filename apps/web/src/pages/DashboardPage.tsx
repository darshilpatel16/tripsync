import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { useAuth } from "../auth/useAuth";
import { ProfilePhotoEditor } from "../components/ProfilePhotoEditor";
import { ApiError } from "../lib/api";
import {
  acceptDashboardInvitation,
  declineDashboardInvitation,
  listMyInvitations,
  listTrips,
} from "../trips/trip-api";
import type { InvitationDetail, TripSummary } from "../trips/trip-types";

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
  const [invitations, setInvitations] = useState<InvitationDetail[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [respondingInvitationId, setRespondingInvitationId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    Promise.all([listTrips(), listMyInvitations()])
      .then(([tripList, invitationList]) => {
        if (isActive) {
          setTrips(tripList);
          setInvitations(invitationList);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "TripSync could not load your dashboard.",
          );
          setStatus("error");
        }
      });
    return () => { isActive = false; };
  }, []);

  const handleInvitation = async (
    invitation: InvitationDetail,
    decision: "accept" | "decline",
  ) => {
    setErrorMessage("");
    setRespondingInvitationId(invitation.id);
    try {
      if (decision === "accept") {
        const result = await acceptDashboardInvitation(invitation.id);
        navigate(`/trips/${result.tripId}`);
      } else {
        await declineDashboardInvitation(invitation.id);
        setInvitations((current) => current.filter((item) => item.id !== invitation.id));
      }
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "TripSync could not respond to this invitation.",
      );
    } finally {
      setRespondingInvitationId(null);
    }
  };

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
        <ProfilePhotoEditor />
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">Your dashboard</p>
            <h1>Welcome, {user?.displayName}.</h1>
          </div>
          <Link className="primary-action" to="/trips/new">Create trip</Link>
        </div>

        {status === "loading" ? <p className="status-message">Loading your dashboard…</p> : null}
        {errorMessage ? <div className="form-message form-message-error" role="alert">{errorMessage}</div> : null}

        {status === "ready" && invitations.length > 0 ? (
          <section className="dashboard-invitations" aria-labelledby="dashboard-invitations-heading">
            <div className="section-heading">
              <p className="eyebrow">Invitations for you</p>
              <h2 id="dashboard-invitations-heading">Your friends are planning.</h2>
            </div>
            <div className="dashboard-invitation-grid">
              {invitations.map((invitation) => {
                const isResponding = respondingInvitationId === invitation.id;
                return (
                  <article className="dashboard-invitation-card" key={invitation.id}>
                    <div>
                      <span className="invitation-label">Invited by {invitation.invitedBy.displayName}</span>
                      <h3>{invitation.trip.name}</h3>
                      <p className="trip-destination">{invitation.trip.destination}</p>
                      <p>{formatTripDates(invitation.trip.startDate, invitation.trip.endDate)}</p>
                    </div>
                    <div className="dashboard-invitation-actions">
                      <button
                        disabled={isResponding}
                        onClick={() => void handleInvitation(invitation, "accept")}
                        type="button"
                      >{isResponding ? "Responding…" : "Accept"}</button>
                      <button
                        className="secondary-button"
                        disabled={isResponding}
                        onClick={() => void handleInvitation(invitation, "decline")}
                        type="button"
                      >Decline</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {status === "ready" && trips.length === 0 ? (
          <div className="empty-state">
            <h2>Your next trip starts here.</h2>
            <p>Create one shared space for your destination, dates, group plans and expenses.</p>
            <Link className="primary-action" to="/trips/new">Create your first trip</Link>
          </div>
        ) : null}

        {status === "ready" && trips.length > 0 ? (
          <section aria-labelledby="your-trips-heading">
            <div className="section-heading your-trips-heading">
              <p className="eyebrow">Your trips</p>
              <h2 id="your-trips-heading">Plans you have joined.</h2>
            </div>
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
          </section>
        ) : null}
      </section>
    </main>
  );
}
