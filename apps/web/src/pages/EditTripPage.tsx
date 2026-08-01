import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { ApiError } from "../lib/api";
import { CurrencySelect } from "../components/CurrencySelect";
import { majorToMinor, minorToMajor } from "../lib/currency";
import { getTrip, updateTrip } from "../trips/trip-api";
import type { CreateTripInput } from "../trips/trip-types";

type FieldErrors = Partial<Record<keyof CreateTripInput, string>>;

const emptyValues: CreateTripInput = {
  name: "",
  destination: "",
  startDate: "",
  endDate: "",
  currency: "GBP",
  budgetMinor: null,
};

export function EditTripPage() {
  const { tripId = "" } = useParams();
  const navigate = useNavigate();
  const [values, setValues] = useState(emptyValues);
  const [budget, setBudget] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "forbidden">("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;
    getTrip(tripId)
      .then((trip) => {
        if (!isActive) return;
        if (trip.role !== "OWNER") {
          setStatus("forbidden");
          return;
        }
        setValues({
          name: trip.name,
          destination: trip.destination,
          startDate: trip.startDate.slice(0, 10),
          endDate: trip.endDate.slice(0, 10),
          currency: trip.currency,
          budgetMinor: trip.budgetMinor,
        });
        setBudget(
          trip.budgetMinor === null
            ? ""
            : String(minorToMajor(trip.budgetMinor, trip.currency)),
        );
        setStatus("ready");
      })
      .catch((error) => {
        if (isActive) {
          setFormError(
            error instanceof ApiError
              ? error.message
              : "TripSync could not load this trip.",
          );
          setStatus("forbidden");
        }
      });
    return () => { isActive = false; };
  }, [tripId]);

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
      const budgetMinor = budget.trim()
        ? majorToMinor(budget, values.currency)
        : null;
      await updateTrip(tripId, { ...values, budgetMinor });
      navigate(`/trips/${tripId}`, { replace: true });
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
      } else if (error instanceof Error && error.message === "Enter a positive amount") {
        setFieldErrors({ budgetMinor: "Enter a budget greater than zero" });
        setFormError("Check the trip budget and try again.");
      } else {
        setFormError("TripSync could not update this trip. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return <main className="status-page"><p>Loading trip details…</p></main>;
  }

  if (status === "forbidden") {
    return (
      <main className="status-page">
        <div>
          <p className="form-message form-message-error">
            {formError || "Only the trip owner can edit these details."}
          </p>
          <Link to={`/trips/${tripId}`}>Back to trip</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <nav className="dashboard-nav">
        <Link className="brand" to="/dashboard">TripSync</Link>
        <Link className="nav-link" to={`/trips/${tripId}`}>Cancel</Link>
      </nav>

      <section className="form-page-content">
        <div className="page-heading">
          <p className="eyebrow">Owner controls</p>
          <h1>Edit your trip.</h1>
          <p className="lede">Keep the destination, dates, and shared currency accurate for everyone.</p>
        </div>

        <form className="trip-form" onSubmit={handleSubmit} noValidate>
          {formError ? <div className="form-message form-message-error" role="alert">{formError}</div> : null}

          <label className="form-field">
            <span>Trip name</span>
            <input name="name" onChange={handleChange} required value={values.name} />
            {fieldErrors.name ? <small className="field-error">{fieldErrors.name}</small> : null}
          </label>

          <label className="form-field">
            <span>Destination</span>
            <input name="destination" onChange={handleChange} required value={values.destination} />
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
            <CurrencySelect name="currency" onChange={handleChange} value={values.currency} />
            {fieldErrors.currency ? <small className="field-error">{fieldErrors.currency}</small> : null}
          </label>

          <label className="form-field">
            <span>Total trip budget ({values.currency})</span>
            <input
              inputMode="decimal"
              onChange={(event) => {
                setBudget(event.target.value);
                setFieldErrors((current) => ({ ...current, budgetMinor: undefined }));
                setFormError("");
              }}
              placeholder="1500.00"
              value={budget}
            />
            <small>Optional group budget. Leave this empty to remove it.</small>
            {fieldErrors.budgetMinor ? <small className="field-error">{fieldErrors.budgetMinor}</small> : null}
          </label>

          <button className="auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving changes…" : "Save changes"}
          </button>
        </form>
      </section>
    </main>
  );
}
