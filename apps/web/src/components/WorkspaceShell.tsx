import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";

import { useAuth } from "../auth/useAuth";
import { Avatar } from "./Avatar";

type WorkspaceShellProps = { children: ReactNode; onLogout?: () => void; isLoggingOut?: boolean; tripId?: string };

// SVG paths keep navigation icons lightweight and inherit the sidebar colour.
const icons = {
  dashboard: "M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z",
  trips: "M4 7h16M7 4v6m10-6v6M5 7l1 13h12l1-13M9 11v5m6-5v5",
  itinerary: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 8h3m2 0h3m-8 4h3m2 0h3",
  expenses: "M12 3v18m4-14.5c-.8-1-2.1-1.5-4-1.5-2.2 0-4 1.2-4 3s1.8 2.7 4 3 4 1.2 4 3-1.8 3-4 3c-1.9 0-3.3-.6-4.2-1.7",
  members: "M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9m-2-11.2a4 4 0 0 1 0 7.7",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5a7.7 7.7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a8 8 0 0 0-1.7-1L14.7 3h-4L10 5.9a8 8 0 0 0-1.7 1L5.8 6 3.8 9.4 6 11a7.7 7.7 0 0 0 0 2l-2.2 1.6 2 3.4 2.5-1a8 8 0 0 0 1.7 1l.7 2.9h4l.6-2.9a8 8 0 0 0 1.7-1l2.5 1 2-3.4-2.1-1.6a7.7 7.7 0 0 0 .1-1Z",
};

function NavIcon({ path }: { path: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={path} /></svg>;
}

export function WorkspaceShell({ children, onLogout, isLoggingOut, tripId }: WorkspaceShellProps) {
  const { user } = useAuth();
  const location = useLocation();
  const tripBase = tripId ? `/trips/${tripId}` : "/dashboard";
  // Trip-specific links fall back to the trip list until a trip is selected.
  const items = [
    ["Dashboard", "/dashboard", icons.dashboard, location.pathname === "/dashboard", false],
    ["Trips", "/trips", icons.trips, location.pathname === "/trips" || (location.pathname === tripBase && Boolean(tripId)), false],
    ["Itinerary", tripId ? `${tripBase}/itinerary` : "/trips", icons.itinerary, location.pathname.endsWith("/itinerary"), false],
    ["Expenses", tripId ? `${tripBase}/expenses` : "/trips", icons.expenses, location.pathname.endsWith("/expenses"), false],
    ["Members", tripId ? `${tripBase}/members` : "/trips", icons.members, location.pathname.endsWith("/members"), false],
    ["Settings", tripId ? `${tripBase}/settings` : "/trips", icons.settings, location.pathname.endsWith("/settings"), false],
  ] as const;

  // The shell is shared by every authenticated page so navigation and profile
  // access remain consistent as the user moves between trip sections.
  return <div className="workspace-shell">
    <aside className="workspace-sidebar">
      <Link className="workspace-brand" to="/dashboard"><span>Trip</span>Sync</Link>
      <nav className="workspace-nav" aria-label="Workspace navigation">
        {items.map(([label, to, icon, active, disabled]) => <Link
          aria-disabled={disabled || undefined}
          className={`workspace-nav-link${active ? " active" : ""}${disabled ? " disabled" : ""}`}
          key={label}
          onClick={disabled ? (event) => event.preventDefault() : undefined}
          tabIndex={disabled ? -1 : undefined}
          to={to}
        ><NavIcon path={icon} /><span>{label}</span></Link>)}
      </nav>
      <Link className={`workspace-profile${location.pathname === "/profile" ? " active" : ""}`} to="/profile" aria-label="Open profile">
        <Avatar name={user?.displayName || "TripSync user"} photo={user?.avatarDataUrl} />
        <div><strong>{user?.displayName}</strong><span>{user?.email}</span></div>
        {onLogout ? <button className="workspace-signout" disabled={isLoggingOut} onClick={(event) => { event.preventDefault(); onLogout(); }} type="button" aria-label="Sign out">↗</button> : <span className="workspace-profile-arrow">›</span>}
      </Link>
    </aside>
    <main className="workspace-main">{children}</main>
  </div>;
}
