import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";

import { ActivitySection } from "../activities/ActivitySection";
import { useAuth } from "../auth/useAuth";
import { Avatar } from "../components/Avatar";
import { WorkspaceShell } from "../components/WorkspaceShell";
import { DestinationArt } from "../components/DestinationArt";
import { destinationTheme } from "../components/destination-theme";
import { ExpenseSection } from "../expenses/ExpenseSection";
import { ApiError } from "../lib/api";
import { createTripInvitation, getTrip, listTripInvitations, removeTripMember } from "../trips/trip-api";
import type { EmailDelivery, TripDetail, TripInvitation } from "../trips/trip-types";

export type TripWorkspaceMode = "overview" | "itinerary" | "expenses" | "members" | "settings";
type Props = { mode: TripWorkspaceMode };

const formatDate = (value: string) => new Date(value).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" });

export function TripWorkspacePage({ mode }: Props) {
  const { tripId = "" } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitations, setInvitations] = useState<TripInvitation[]>([]);
  const [invitationResult, setInvitationResult] = useState<{ invitationUrl: string; emailDelivery: EmailDelivery } | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const loadTrip = useCallback(async () => {
    const result = await getTrip(tripId);
    setTrip(result);
    // Invitation history contains owner-only information, so fetch it only on
    // the member page and only after the API confirms ownership.
    if (mode === "members" && result.role === "OWNER") setInvitations(await listTripInvitations(tripId));
  }, [mode, tripId]);

  useEffect(() => {
    let active = true;
    loadTrip().catch((requestError) => {
      if (active) setError(requestError instanceof ApiError ? requestError.message : "TripSync could not load this trip.");
    });
    return () => { active = false; };
  }, [loadTrip]);

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setInvitationResult(null);
    setIsWorking(true);
    try {
      const result = await createTripInvitation(tripId, inviteEmail);
      setInvitationResult({ invitationUrl: result.invitationUrl, emailDelivery: result.emailDelivery });
      setInviteEmail("");
      // Refresh both the member count and invitation history after creation.
      await loadTrip();
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "TripSync could not create this invitation.");
    } finally { setIsWorking(false); }
  };

  const handleRemoveMember = async (userId: string, displayName: string) => {
    // Membership changes are destructive and should always require a clear
    // confirmation using the affected member's name.
    if (!window.confirm(`Remove ${displayName} from this trip?`)) return;
    setError("");
    setIsWorking(true);
    try { await removeTripMember(tripId, userId); await loadTrip(); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : "TripSync could not remove this member."); }
    finally { setIsWorking(false); }
  };

  if (error && !trip) return <WorkspaceShell tripId={tripId}><section className="workspace-page"><p className="form-message form-message-error">{error}</p></section></WorkspaceShell>;
  if (!trip || !user) return <WorkspaceShell tripId={tripId}><section className="workspace-page"><p>Loading trip…</p></section></WorkspaceShell>;

  return <WorkspaceShell tripId={trip.id}>
    <section className={`workspace-page trip-section-page trip-${mode}-page destination-page-${destinationTheme(trip.destination).key}`}>
      {/* Expenses has its own data-heavy header; other sections use destination artwork. */}
      {mode !== "expenses" ? <DestinationArt destination={trip.destination} compact={mode !== "overview"} /> : null}
      {mode === "overview" ? <>
        <div className="trip-detail-header"><div><p className="eyebrow">{trip.role === "OWNER" ? "You are organising" : "Group trip"}</p><h1>{trip.name}</h1><p className="workspace-lede">{trip.destination}</p></div>{trip.role === "OWNER" ? <Link className="secondary-button edit-trip-link" to={`/trips/${trip.id}/edit`}>Edit trip</Link> : null}</div>
        <div className="trip-detail-facts"><div><span>Start date</span><strong>{formatDate(trip.startDate)}</strong></div><div><span>End date</span><strong>{formatDate(trip.endDate)}</strong></div><div><span>Currency</span><strong>{trip.currency}</strong></div><div><span>Travellers</span><strong>{trip.memberCount}</strong></div></div>
        <div className="trip-next-steps"><h2>Continue planning</h2><p>Use the sidebar to open the itinerary, expenses, members or settings page for this trip.</p></div>
      </> : null}
      {mode === "itinerary" ? <><div className="workspace-page-heading"><div><p className="eyebrow">{trip.name}</p><h1>Itinerary</h1><p>Create and organise activities for this trip.</p></div></div><ActivitySection currentUserId={user.id} tripId={trip.id} tripEndDate={trip.endDate} tripRole={trip.role} tripStartDate={trip.startDate} /></> : null}
      {mode === "expenses" ? <><div className="workspace-page-heading"><div><p className="eyebrow">{trip.name}</p><h1>Expenses</h1><p>Manage the budget, costs, balances and repayments.</p></div></div><ExpenseSection currentUserId={user.id} trip={trip} /></> : null}
      {mode === "members" ? <><div className="workspace-page-heading"><div><p className="eyebrow">{trip.name}</p><h1>Members</h1><p>Everyone travelling on this trip.</p></div></div>
        {error ? <p className="form-message form-message-error" role="alert">{error}</p> : null}
        {trip.role === "OWNER" ? <section className="member-invite-panel">
          <div><p className="eyebrow">Add a member</p><h2>Invite someone to this trip.</h2><p>Enter their email address to create a secure invitation.</p></div>
          <form onSubmit={handleInvite}><label className="form-field"><span>Email address</span><input onChange={(event) => setInviteEmail(event.target.value)} placeholder="friend@example.com" required type="email" value={inviteEmail}/></label><button disabled={isWorking} type="submit">{isWorking ? "Sending…" : "Invite member"}</button></form>
          {invitationResult ? <div className="invitation-result" role="status"><strong>{invitationResult.emailDelivery === "SENT" ? "Invitation email sent." : "Invitation link created."}</strong><input aria-label="Invitation link" readOnly value={invitationResult.invitationUrl}/><button className="secondary-button" onClick={() => void navigator.clipboard.writeText(invitationResult.invitationUrl)} type="button">Copy link</button></div> : null}
          {invitations.length ? <div className="member-invitations"><h3>Pending and previous invitations</h3>{invitations.map((invitation) => <div key={invitation.id}><span>{invitation.email}</span><strong>{invitation.status.toLowerCase()}</strong></div>)}</div> : null}
        </section> : null}
        <div className="member-directory">{trip.members.map((member) => <article key={member.user.id}><Avatar name={member.user.displayName} photo={member.user.avatarDataUrl} size="large"/><div><h2>{member.user.displayName}</h2><span>{member.role === "OWNER" ? "Trip organiser" : "Traveller"}</span></div><dl><div><dt>Email address</dt><dd>{member.user.email}</dd></div><div><dt>Phone number</dt><dd>Not provided</dd></div></dl>{trip.role === "OWNER" && member.role !== "OWNER" ? <button className="secondary-button member-remove-button" disabled={isWorking} onClick={() => void handleRemoveMember(member.user.id, member.user.displayName)} type="button">Remove member</button> : null}</article>)}</div></> : null}
      {mode === "settings" ? <><div className="workspace-page-heading"><div><p className="eyebrow">{trip.name}</p><h1>Trip settings</h1><p>Review and update the main trip information.</p></div></div><div className="settings-card"><div><span>Trip name</span><strong>{trip.name}</strong></div><div><span>Destination</span><strong>{trip.destination}</strong></div><div><span>Dates</span><strong>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</strong></div><div><span>Currency</span><strong>{trip.currency}</strong></div>{trip.role === "OWNER" ? <Link className="primary-action" to={`/trips/${trip.id}/edit`}>Edit trip settings</Link> : null}</div></> : null}
    </section>
  </WorkspaceShell>;
}
