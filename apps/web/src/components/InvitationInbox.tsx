import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import {
  acceptDashboardInvitation,
  declineDashboardInvitation,
  listMyInvitations,
} from "../trips/trip-api";
import type { InvitationDetail } from "../trips/trip-types";

const formatDates = (startDate: string, endDate: string) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${formatter.format(new Date(startDate))} – ${formatter.format(new Date(endDate))}`;
};

export function InvitationInbox() {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<InvitationDetail[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [responding, setResponding] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Invitation loading is deliberately independent from the page so a temporary
    // inbox problem never prevents the traveller from using their dashboard.
    let active = true;
    listMyInvitations()
      .then((items) => {
        if (active) setInvitations(items.filter((item) => item.status === "PENDING"));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const invitation = invitations[0];
  if (!invitation || dismissed) return null;

  const removeCurrentInvitation = () => {
    setInvitations((current) => current.filter((item) => item.id !== invitation.id));
    setMessage("");
  };

  const accept = async () => {
    setResponding(true);
    setMessage("");
    try {
      const result = await acceptDashboardInvitation(invitation.id);
      removeCurrentInvitation();
      navigate(`/trips/${result.tripId}`);
    } catch {
      setMessage("We could not accept this invitation. Please try again.");
      setResponding(false);
    }
  };

  const decline = async () => {
    setResponding(true);
    setMessage("");
    try {
      await declineDashboardInvitation(invitation.id);
      removeCurrentInvitation();
      setResponding(false);
    } catch {
      setMessage("We could not decline this invitation. Please try again.");
      setResponding(false);
    }
  };

  return <div className="invitation-inbox-backdrop">
    <section className="invitation-inbox-card" role="dialog" aria-modal="true" aria-labelledby="invitation-inbox-title">
      <button className="invitation-inbox-dismiss" type="button" onClick={() => setDismissed(true)} aria-label="Review invitation later">×</button>
      <p className="eyebrow">New trip request</p>
      <h2 id="invitation-inbox-title">You’re invited to {invitation.trip.name}</h2>
      <p><strong>{invitation.invitedBy.displayName}</strong> invited you to join this trip.</p>
      <div className="invitation-inbox-details">
        <span><strong>Destination</strong>{invitation.trip.destination}</span>
        <span><strong>Travel dates</strong>{formatDates(invitation.trip.startDate, invitation.trip.endDate)}</span>
      </div>
      {invitations.length > 1 ? <p className="invitation-inbox-count">You have {invitations.length} pending invitations.</p> : null}
      {message ? <p className="form-message form-message-error" role="alert">{message}</p> : null}
      <div className="invitation-inbox-actions">
        <button className="secondary-button" type="button" disabled={responding} onClick={decline}>Decline</button>
        <button className="primary-action" type="button" disabled={responding} onClick={accept}>{responding ? "Please wait…" : "Accept and view trip"}</button>
      </div>
    </section>
  </div>;
}
