import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { useAuth } from "../auth/useAuth";
import { ApiError } from "../lib/api";
import {
  acceptInvitation,
  declineInvitation,
  getInvitation,
} from "../trips/trip-api";
import type { InvitationDetail } from "../trips/trip-types";

export function InvitationPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { status, user } = useAuth();
  const [invitation, setInvitation] = useState<InvitationDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const invitationPath = `/invitations/${token}`;

  useEffect(() => {
    let isActive = true;
    getInvitation(token)
      .then((result) => { if (isActive) setInvitation(result); })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(error instanceof ApiError ? error.message : "TripSync could not open this invitation.");
        }
      });
    return () => { isActive = false; };
  }, [token]);

  const respond = async (decision: "accept" | "decline") => {
    setErrorMessage("");
    setIsResponding(true);
    try {
      const result = decision === "accept"
        ? await acceptInvitation(token)
        : await declineInvitation(token);
      if (decision === "accept") {
        navigate(`/trips/${result.tripId}`, { replace: true });
      } else {
        setInvitation((current) => current ? { ...current, status: "DECLINED" } : current);
      }
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "TripSync could not respond to this invitation.");
    } finally {
      setIsResponding(false);
    }
  };

  if (errorMessage && !invitation) {
    return <main className="status-page"><div><p className="form-message form-message-error">{errorMessage}</p><Link to="/">Go to TripSync</Link></div></main>;
  }
  if (!invitation || status === "loading") return <main className="status-page"><p>Opening invitation…</p></main>;

  const correctAccount = user?.email === invitation.email;
  const isPending = invitation.status === "PENDING";

  return (
    <main className="invitation-page">
      <nav className="auth-nav"><Link className="brand" to="/">TripSync</Link></nav>
      <section className="invitation-card">
        <p className="eyebrow">Trip invitation</p>
        <h1>{invitation.trip.name}</h1>
        <p className="lede">
          {invitation.invitedBy.displayName} invited you to plan a trip to {invitation.trip.destination}.
        </p>
        <div className="invitation-facts">
          <span>{new Date(invitation.trip.startDate).toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "UTC" })}</span>
          <span>to</span>
          <span>{new Date(invitation.trip.endDate).toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "UTC" })}</span>
        </div>

        {errorMessage ? <p className="form-message form-message-error" role="alert">{errorMessage}</p> : null}

        {!isPending ? (
          <div className="form-message form-message-success">This invitation is {invitation.status.toLowerCase()}.</div>
        ) : status === "guest" ? (
          <div className="invitation-actions">
            <p>Sign in or create an account using <strong>{invitation.email}</strong>.</p>
            <Link className="primary-action" state={{ returnTo: invitationPath, email: invitation.email }} to="/login">Sign in to respond</Link>
            <Link className="nav-link" state={{ returnTo: invitationPath, email: invitation.email }} to="/register">Create account</Link>
          </div>
        ) : !correctAccount ? (
          <p className="form-message form-message-error">
            This invitation belongs to {invitation.email}. You are signed in as {user?.email}.
          </p>
        ) : (
          <div className="invitation-actions invitation-button-row">
            <button disabled={isResponding} onClick={() => void respond("accept")} type="button">Accept invitation</button>
            <button className="secondary-button" disabled={isResponding} onClick={() => void respond("decline")} type="button">Decline</button>
          </div>
        )}
      </section>
    </main>
  );
}
