import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { ActivitySection } from "../activities/ActivitySection";
import { useAuth } from "../auth/useAuth";
import { ApiError } from "../lib/api";
import {
  createTripInvitation,
  deleteTrip,
  getTrip,
  leaveTrip,
  listTripInvitations,
  removeTripMember,
} from "../trips/trip-api";
import type { EmailDelivery, TripDetail, TripInvitation } from "../trips/trip-types";

type InvitationResult = {
  invitationUrl: string;
  emailDelivery: EmailDelivery;
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  });

export function TripOverviewPage() {
  const { tripId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [invitations, setInvitations] = useState<TripInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitationResult, setInvitationResult] = useState<InvitationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const loadTrip = useCallback(async () => {
    const result = await getTrip(tripId);
    setTrip(result);
    if (result.role === "OWNER") {
      setInvitations(await listTripInvitations(tripId));
    }
  }, [tripId]);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        const result = await getTrip(tripId);
        if (!isActive) return;
        setTrip(result);
        if (result.role === "OWNER") {
          const invitationList = await listTripInvitations(tripId);
          if (isActive) setInvitations(invitationList);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "TripSync could not load this trip.",
          );
        }
      }
    };
    void load();
    return () => { isActive = false; };
  }, [tripId]);

  const showRequestError = (error: unknown, fallback: string) => {
    setErrorMessage(error instanceof ApiError ? error.message : fallback);
  };

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setInvitationResult(null);
    setIsWorking(true);
    try {
      const result = await createTripInvitation(tripId, inviteEmail);
      setInvitationResult({
        invitationUrl: result.invitationUrl,
        emailDelivery: result.emailDelivery,
      });
      setInviteEmail("");
      await loadTrip();
    } catch (error) {
      showRequestError(error, "TripSync could not create this invitation.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleRemoveMember = async (userId: string, displayName: string) => {
    if (!window.confirm(`Remove ${displayName} from this trip?`)) return;
    setIsWorking(true);
    try {
      await removeTripMember(tripId, userId);
      await loadTrip();
    } catch (error) {
      showRequestError(error, "TripSync could not remove this member.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this trip? You will need a new invitation to rejoin.")) return;
    setIsWorking(true);
    try {
      await leaveTrip(tripId);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      showRequestError(error, "TripSync could not leave this trip.");
      setIsWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!trip || !window.confirm(`Delete “${trip.name}”? This cannot be undone.`)) return;
    setIsWorking(true);
    try {
      await deleteTrip(trip.id);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      showRequestError(error, "TripSync could not delete this trip.");
      setIsWorking(false);
    }
  };

  if (errorMessage && !trip) {
    return (
      <main className="status-page">
        <div>
          <p className="form-message form-message-error">{errorMessage}</p>
          <Link to="/dashboard">Back to dashboard</Link>
        </div>
      </main>
    );
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
          <div className="trip-hero-heading">
            <p className="eyebrow">{trip.role === "OWNER" ? "You are organising" : "Group trip"}</p>
            {trip.role === "OWNER" ? (
              <Link className="secondary-button edit-trip-link" to={`/trips/${trip.id}/edit`}>Edit trip</Link>
            ) : null}
          </div>
          <h1>{trip.name}</h1>
          <p className="lede">{trip.destination}</p>
          <div className="trip-facts">
            <span>{formatDate(trip.startDate)}</span><span>to</span>
            <span>{formatDate(trip.endDate)}</span><span>·</span><span>{trip.currency}</span>
          </div>
        </div>

        {errorMessage ? <p className="form-message form-message-error" role="alert">{errorMessage}</p> : null}

        {user ? (
          <ActivitySection
            currentUserId={user.id}
            tripId={trip.id}
            tripEndDate={trip.endDate}
            tripRole={trip.role}
            tripStartDate={trip.startDate}
          />
        ) : null}

        <div className="overview-grid">
          <section className="overview-card">
            <p className="eyebrow">Travellers</p>
            <h2>{trip.memberCount} in this trip</h2>
            <div className="member-list">
              {trip.members.map((member) => (
                <div className="member-row" key={member.user.id}>
                  <div><strong>{member.user.displayName}</strong><span>{member.user.email}</span></div>
                  <div className="member-actions">
                    <span>{member.role === "OWNER" ? "Owner" : "Member"}</span>
                    {trip.role === "OWNER" && member.role !== "OWNER" ? (
                      <button
                        className="text-button danger-text"
                        disabled={isWorking}
                        onClick={() => void handleRemoveMember(member.user.id, member.user.displayName)}
                        type="button"
                      >Remove</button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {trip.role === "OWNER" ? (
            <section className="overview-card invite-card">
              <p className="eyebrow">Invite a traveller</p>
              <h2>Grow the group.</h2>
              <form className="invite-form" onSubmit={handleInvite}>
                <label className="form-field">
                  <span>Email address</span>
                  <input
                    name="inviteEmail"
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="friend@example.com"
                    required
                    type="email"
                    value={inviteEmail}
                  />
                </label>
                <button disabled={isWorking} type="submit">
                  {isWorking ? "Creating invitation…" : "Send invitation"}
                </button>
              </form>
              {invitationResult ? (
                <div className="invitation-result" role="status">
                  <strong>
                    {invitationResult.emailDelivery === "SENT"
                      ? "Invitation email sent."
                      : invitationResult.emailDelivery === "FAILED"
                        ? "Email failed, but the secure link is ready."
                        : "Development mode: copy and share this secure link."}
                  </strong>
                  <input aria-label="Invitation link" readOnly value={invitationResult.invitationUrl} />
                  <button
                    className="secondary-button"
                    onClick={() => void navigator.clipboard.writeText(invitationResult.invitationUrl)}
                    type="button"
                  >Copy link</button>
                </div>
              ) : null}
              {invitations.length ? (
                <div className="invitation-list">
                  <h3>Invitation history</h3>
                  {invitations.map((invitation) => (
                    <div className="invitation-row" key={invitation.id}>
                      <span>{invitation.email}</span>
                      <strong>{invitation.status.toLowerCase()}</strong>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : (
            <section className="overview-card muted-card">
              <p className="eyebrow">Your membership</p>
              <h2>You are part of this plan.</h2>
              <p>You can leave at any time. You would need a new invitation to join again.</p>
              <button className="secondary-button" disabled={isWorking} onClick={() => void handleLeave()} type="button">Leave trip</button>
            </section>
          )}
        </div>

        {trip.role === "OWNER" ? (
          <div className="danger-zone">
            <div><strong>Delete trip</strong><p>Permanently remove this trip and its shared information.</p></div>
            <button className="danger-button" disabled={isWorking} onClick={() => void handleDelete()} type="button">{isWorking ? "Working…" : "Delete trip"}</button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
