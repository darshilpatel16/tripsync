import { useState, type FormEvent } from "react";
import { Link } from "react-router";

import { ApiError, apiRequest } from "../lib/api";

type ForgotPasswordResponse = {
  data: {
    message: string;
    resetToken?: string;
  };
};

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const response = await apiRequest<ForgotPasswordResponse>(
        "/auth/forgot-password",
        { method: "POST", body: JSON.stringify({ email }) },
      );
      setMessage(response.data.message);
      setResetToken(response.data.resetToken ?? "");
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "TripSync could not start the password reset. Please try again.",
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
            <p className="eyebrow">Account recovery</p>
            <h2>Reset your password</h2>
            <p>Enter the email address connected to your account.</p>
          </div>

          {message ? (
            <div className="form-message form-message-success" role="status">
              {message}
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
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <button className="auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating reset link…" : "Request reset link"}
          </button>

          {resetToken ? (
            <div className="development-note">
              <strong>Local development only:</strong> email delivery is not
              connected yet. Use the generated reset link below.
              <Link to={`/reset-password?token=${resetToken}`}>
                Open password reset page
              </Link>
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}
