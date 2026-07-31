import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { useAuth } from "../auth/useAuth";
import { ApiError } from "../lib/api";

type LoginLocationState = {
  email?: string;
  passwordReset?: boolean;
  registered?: boolean;
  returnTo?: string;
};

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const state = location.state as LoginLocationState | null;
  const [email, setEmail] = useState(state?.email ?? "");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(state?.returnTo ?? "/dashboard", { replace: true });
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "TripSync could not sign you in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in to TripSync</h2>
          </div>

          {state?.registered ? (
            <div className="form-message form-message-success" role="status">
              Your account was created. You can sign in now.
            </div>
          ) : null}

          {state?.passwordReset ? (
            <div className="form-message form-message-success" role="status">
              Your password was changed. Sign in with your new password.
            </div>
          ) : null}

          {formError ? (
            <div className="form-message form-message-error" role="alert">
              {formError}
            </div>
          ) : null}

          <label className="form-field">
            <span>Email address</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          <Link className="forgot-link" to="/forgot-password">
            Forgot your password?
          </Link>

          <button className="auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>

          <p className="auth-switch">
            New to TripSync? <Link to="/register">Create an account</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
