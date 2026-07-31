import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { ApiError, apiRequest } from "../lib/api";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!token) {
      setFormError("This reset link is missing its secure token.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords must match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest<void>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "TripSync could not reset your password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <nav className="auth-nav">
        <Link className="brand" to="/">TripSync</Link>
        <Link className="nav-link" to="/login">Back to sign in</Link>
      </nav>
      <section className="auth-layout auth-layout-centered">
        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <div>
            <p className="eyebrow">Choose a new password</p>
            <h2>Secure your account</h2>
            <p>Your new password must contain at least 12 characters.</p>
          </div>

          {formError ? (
            <div className="form-message form-message-error" role="alert">
              {formError}
            </div>
          ) : null}

          <label className="form-field">
            <span>New password</span>
            <input
              autoComplete="new-password"
              minLength={12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <label className="form-field">
            <span>Confirm new password</span>
            <input
              autoComplete="new-password"
              minLength={12}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </label>

          <button className="auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Changing password…" : "Change password"}
          </button>
        </form>
      </section>
    </main>
  );
}
