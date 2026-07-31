import { Link, useLocation } from "react-router";

type LoginLocationState = {
  email?: string;
  registered?: boolean;
};

export function LoginPage() {
  const location = useLocation();
  const state = location.state as LoginLocationState | null;

  return (
    <main className="auth-page">
      <nav className="auth-nav" aria-label="Authentication navigation">
        <Link className="brand" to="/">
          TripSync
        </Link>
        <Link className="nav-link" to="/register">
          Create account
        </Link>
      </nav>

      <section className="auth-layout auth-layout-centered">
        <div className="auth-card">
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to TripSync</h2>
          {state?.registered ? (
            <div className="form-message form-message-success" role="status">
              Your account was created. Sign in with {state.email}.
            </div>
          ) : null}
          <p>The complete sign-in form is the next frontend step.</p>
        </div>
      </section>
    </main>
  );
}
