import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import { ApiError } from "../lib/api";
import { createTrip } from "../trips/trip-api";
import type { CreateTripInput } from "../trips/trip-types";

type FieldErrors = Partial<Record<keyof CreateTripInput, string>>;

const initialValues: CreateTripInput = {
  name: "",
  destination: "",
  startDate: "",
  endDate: "",
  currency: "GBP",
};

export function CreateTripPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const name = event.target.name as keyof CreateTripInput;
    setValues((current) => ({ ...current, [name]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setFormError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError("");
    setIsSubmitting(true);

    try {
      const trip = await createTrip(values);
      navigate(`/trips/${trip.id}`, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        const nextErrors: FieldErrors = {};
        for (const detail of error.details) {
          if (detail.path in values) {
            nextErrors[detail.path as keyof CreateTripInput] = detail.message;
          }
        }
        setFieldErrors(nextErrors);
        setFormError(error.message);
      } else {
        setFormError("TripSync could not create your trip. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav">
        <Link className="brand" to="/dashboard">TripSync</Link>
        <Link className="nav-link" to="/dashboard">Cancel</Link>
      </nav>

      <section className="form-page-content">
        <div className="page-heading">
          <p className="eyebrow">New adventure</p>
          <h1>Create a trip.</h1>
          <p className="lede">Start with the essentials. Your group can build the itinerary together later.</p>
        </div>

        <form className="trip-form" onSubmit={handleSubmit} noValidate>
          {formError ? <div className="form-message form-message-error" role="alert">{formError}</div> : null}

          <label className="form-field">
            <span>Trip name</span>
            <input name="name" onChange={handleChange} placeholder="Summer in Italy" required value={values.name} />
            {fieldErrors.name ? <small className="field-error">{fieldErrors.name}</small> : null}
          </label>

          <label className="form-field">
            <span>Destination</span>
            <input name="destination" onChange={handleChange} placeholder="Rome, Italy" required value={values.destination} />
            {fieldErrors.destination ? <small className="field-error">{fieldErrors.destination}</small> : null}
          </label>

          <div className="form-row">
            <label className="form-field">
              <span>Start date</span>
              <input name="startDate" onChange={handleChange} required type="date" value={values.startDate} />
              {fieldErrors.startDate ? <small className="field-error">{fieldErrors.startDate}</small> : null}
            </label>
            <label className="form-field">
              <span>End date</span>
              <input min={values.startDate} name="endDate" onChange={handleChange} required type="date" value={values.endDate} />
              {fieldErrors.endDate ? <small className="field-error">{fieldErrors.endDate}</small> : null}
            </label>
          </div>

          <label className="form-field">
            <span>Main currency</span>
            <select name="currency" onChange={handleChange} value={values.currency}>
              <option value="GBP">GBP — British pound</option>
              <option value="EUR">EUR — Euro</option>
              <option value="USD">USD — US dollar</option>
            </select>
          </label>

          <button className="auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating trip…" : "Create trip"}
          </button>
        </form>
      </section>
    </main>
  );
}
