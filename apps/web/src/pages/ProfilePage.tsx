import { useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../auth/useAuth";
import { ProfilePhotoEditor } from "../components/ProfilePhotoEditor";
import { WorkspaceShell } from "../components/WorkspaceShell";

export function ProfilePage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const signOut = async () => {
    setSigningOut(true);
    try {
      // Clear the server session before replacing the protected route.
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  // Format once per render so the JSX remains focused on presentation.
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-GB", {
    dateStyle: "long",
  });

  return (
    <WorkspaceShell>
      <section className="workspace-page profile-page">
        <p className="eyebrow">Your account</p>
        <h1>Profile</h1>
        <p className="workspace-lede">Your personal details and profile photo.</p>

        <div className="profile-details-card">
          <ProfilePhotoEditor />
          <dl>
            <div>
              <dt>Full name</dt>
              <dd>{user.displayName}</dd>
            </div>
            <div>
              <dt>Email address</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Mobile number</dt>
              <dd>Not provided</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{memberSince}</dd>
            </div>
          </dl>

          <div className="profile-signout">
            <div>
              <strong>Sign out of TripSync</strong>
              <p>End your current session on this device.</p>
            </div>
            <button
              className="danger-button"
              disabled={signingOut}
              onClick={() => void signOut()}
              type="button"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}
