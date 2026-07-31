import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import { ApiError, apiRequest } from "../lib/api";

type FormValues = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

type RegisterResponse = {
  data: {
    user: {
      id: string;
      displayName: string;
      email: string;
      createdAt: string;
    };
  };
};

const initialValues: FormValues = {
  displayName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fieldName = event.target.name as keyof FormValues;

    setValues((currentValues) => ({
      ...currentValues,
      [fieldName]: event.target.value,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: undefined,
    }));
    setFormError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError("");

    if (values.password !== values.confirmPassword) {
      setFieldErrors({
        confirmPassword: "Passwords must match",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          displayName: values.displayName,
          email: values.email,
          password: values.password,
        }),
      });

      navigate("/login", {
        replace: true,
        state: {
          email: response.data.user.email,
          registered: true,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        const nextFieldErrors: FieldErrors = {};

        for (const detail of error.details) {
          if (
            detail.path === "displayName" ||
            detail.path === "email" ||
            detail.path === "password"
          ) {
            nextFieldErrors[detail.path] = detail.message;
          }
        }

        setFieldErrors(nextFieldErrors);
        setFormError(error.message);
      } else {
        setFormError("TripSync could not create your account. Please try again.");
      }
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
        <Link className="nav-link" to="/login">
          Sign in
        </Link>
      </nav>

      <section className="auth-layout">
        <div className="auth-intro">
          <p className="eyebrow">Start planning together</p>
          <h1>Create your TripSync account.</h1>
          <p className="lede">
            Bring the itinerary, group decisions, and shared expenses into one
            calm place.
          </p>
        </div>

        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <div>
            <h2>Create account</h2>
            <p>Use an email address you can access.</p>
          </div>

          {formError ? (
            <div className="form-message form-message-error" role="alert">
              {formError}
            </div>
          ) : null}

          <label className="form-field">
            <span>Display name</span>
            <input
              autoComplete="name"
              name="displayName"
              onChange={handleChange}
              required
              type="text"
              value={values.displayName}
              aria-invalid={Boolean(fieldErrors.displayName)}
            />
            {fieldErrors.displayName ? (
              <small className="field-error">{fieldErrors.displayName}</small>
            ) : null}
          </label>

          <label className="form-field">
            <span>Email address</span>
            <input
              autoComplete="email"
              name="email"
              onChange={handleChange}
              required
              type="email"
              value={values.email}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email ? (
              <small className="field-error">{fieldErrors.email}</small>
            ) : null}
          </label>

          <label className="form-field">
            <span>Password</span>
            <input
              autoComplete="new-password"
              minLength={12}
              name="password"
              onChange={handleChange}
              required
              type="password"
              value={values.password}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            <small>Use at least 12 characters.</small>
            {fieldErrors.password ? (
              <small className="field-error">{fieldErrors.password}</small>
            ) : null}
          </label>

          <label className="form-field">
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              minLength={12}
              name="confirmPassword"
              onChange={handleChange}
              required
              type="password"
              value={values.confirmPassword}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
            />
            {fieldErrors.confirmPassword ? (
              <small className="field-error">
                {fieldErrors.confirmPassword}
              </small>
            ) : null}
          </label>

          <button className="auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
