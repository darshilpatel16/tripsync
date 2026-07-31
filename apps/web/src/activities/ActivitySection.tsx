import { useCallback, useEffect, useState, type FormEvent } from "react";

import { ApiError } from "../lib/api";
import {
  createActivity,
  deleteActivity,
  listActivities,
  updateActivity,
  updateActivityStatus,
} from "./activity-api";
import type {
  Activity,
  ActivityInput,
  ActivitySectionProps,
  ActivityStatus,
} from "./activity-types";

type ActivityFormState = {
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
};

const emptyForm: ActivityFormState = {
  title: "",
  description: "",
  location: "",
  startsAt: "",
  endsAt: "",
};

const toLocalInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toActivityInput = (form: ActivityFormState): ActivityInput => ({
  title: form.title.trim(),
  description: form.description.trim() || null,
  location: form.location.trim() || null,
  startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
  endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
});

const formFromActivity = (activity: Activity): ActivityFormState => ({
  title: activity.title,
  description: activity.description ?? "",
  location: activity.location ?? "",
  startsAt: toLocalInput(activity.startsAt),
  endsAt: toLocalInput(activity.endsAt),
});

const formatSchedule = (activity: Activity) => {
  if (!activity.startsAt) return "Time to be decided";

  const start = new Date(activity.startsAt);
  const startText = start.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  if (!activity.endsAt) return startText;

  const end = new Date(activity.endsAt);
  const endText = end.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startText}–${endText}`;
};

const statusLabel: Record<ActivityStatus, string> = {
  PROPOSED: "Proposed",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

type ActivityFormProps = {
  form: ActivityFormState;
  isWorking: boolean;
  mode: "create" | "edit";
  onCancel?: () => void;
  onChange: (field: keyof ActivityFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function ActivityForm({
  form,
  isWorking,
  mode,
  onCancel,
  onChange,
  onSubmit,
}: ActivityFormProps) {
  return (
    <form className="activity-form" onSubmit={onSubmit}>
      <label className="form-field activity-title-field">
        <span>Activity name</span>
        <input
          maxLength={100}
          minLength={2}
          onChange={(event) => onChange("title", event.target.value)}
          placeholder="Visit the Colosseum"
          required
          value={form.title}
        />
      </label>
      <label className="form-field">
        <span>Location</span>
        <input
          maxLength={200}
          onChange={(event) => onChange("location", event.target.value)}
          placeholder="Piazza del Colosseo, Rome"
          value={form.location}
        />
      </label>
      <label className="form-field activity-description-field">
        <span>Notes</span>
        <textarea
          maxLength={1000}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder="Tickets, meeting point or anything the group should know"
          rows={3}
          value={form.description}
        />
      </label>
      <label className="form-field">
        <span>Starts</span>
        <input
          onChange={(event) => onChange("startsAt", event.target.value)}
          type="datetime-local"
          value={form.startsAt}
        />
      </label>
      <label className="form-field">
        <span>Ends</span>
        <input
          min={form.startsAt || undefined}
          onChange={(event) => onChange("endsAt", event.target.value)}
          type="datetime-local"
          value={form.endsAt}
        />
      </label>
      <div className="activity-form-actions">
        <button disabled={isWorking} type="submit">
          {isWorking
            ? "Saving…"
            : mode === "create"
              ? "Add to itinerary"
              : "Save activity"}
        </button>
        {onCancel ? (
          <button className="secondary-button" onClick={onCancel} type="button">
            Cancel editing
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function ActivitySection({
  tripId,
  tripRole,
  currentUserId,
}: ActivitySectionProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState<ActivityFormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const loadActivities = useCallback(async () => {
    const result = await listActivities(tripId);
    setActivities(result);
  }, [tripId]);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        const result = await listActivities(tripId);
        if (isActive) setActivities(result);
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "TripSync could not load the itinerary.",
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    void load();
    return () => { isActive = false; };
  }, [tripId]);

  const showError = (error: unknown, fallback: string) => {
    setErrorMessage(error instanceof ApiError ? error.message : fallback);
  };

  const changeCreateForm = (field: keyof ActivityFormState, value: string) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
  };

  const changeEditForm = (field: keyof ActivityFormState, value: string) => {
    setEditForm((current) => current ? { ...current, [field]: value } : current);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setWorkingId("create");
    try {
      await createActivity(tripId, toActivityInput(createForm));
      setCreateForm(emptyForm);
      await loadActivities();
    } catch (error) {
      showError(error, "TripSync could not add this activity.");
    } finally {
      setWorkingId(null);
    }
  };

  const startEditing = (activity: Activity) => {
    setEditingId(activity.id);
    setEditForm(formFromActivity(activity));
    setErrorMessage("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId || !editForm) return;
    setErrorMessage("");
    setWorkingId(editingId);
    try {
      await updateActivity(tripId, editingId, toActivityInput(editForm));
      cancelEditing();
      await loadActivities();
    } catch (error) {
      showError(error, "TripSync could not update this activity.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleDelete = async (activity: Activity) => {
    if (!window.confirm(`Delete “${activity.title}” from the itinerary?`)) return;
    setErrorMessage("");
    setWorkingId(activity.id);
    try {
      await deleteActivity(tripId, activity.id);
      if (editingId === activity.id) cancelEditing();
      await loadActivities();
    } catch (error) {
      showError(error, "TripSync could not delete this activity.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleStatus = async (activity: Activity, status: ActivityStatus) => {
    setErrorMessage("");
    setWorkingId(activity.id);
    try {
      await updateActivityStatus(tripId, activity.id, status);
      await loadActivities();
    } catch (error) {
      showError(error, "TripSync could not change this activity's status.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="itinerary-section" aria-labelledby="itinerary-heading">
      <div className="itinerary-heading">
        <div>
          <p className="eyebrow">Shared itinerary</p>
          <h2 id="itinerary-heading">Plan each memorable stop.</h2>
          <p>Every traveller can propose activities. The organiser confirms the final plan.</p>
        </div>
        <span className="activity-count">{activities.length} {activities.length === 1 ? "activity" : "activities"}</span>
      </div>

      <div className="activity-create-card">
        <h3>Propose an activity</h3>
        <ActivityForm
          form={createForm}
          isWorking={workingId === "create"}
          mode="create"
          onChange={changeCreateForm}
          onSubmit={handleCreate}
        />
      </div>

      {errorMessage ? (
        <p className="form-message form-message-error" role="alert">{errorMessage}</p>
      ) : null}

      {isLoading ? <p className="itinerary-empty">Loading itinerary…</p> : null}
      {!isLoading && activities.length === 0 ? (
        <div className="itinerary-empty">
          <strong>No activities yet.</strong>
          <p>Start with one place, meal or experience the group should not miss.</p>
        </div>
      ) : null}

      <div className="activity-list">
        {activities.map((activity) => {
          const canEdit = tripRole === "OWNER" || activity.createdBy.id === currentUserId;
          const isWorking = workingId === activity.id;

          if (editingId === activity.id && editForm) {
            return (
              <article className="activity-card activity-edit-card" key={activity.id}>
                <p className="eyebrow">Editing activity</p>
                <ActivityForm
                  form={editForm}
                  isWorking={isWorking}
                  mode="edit"
                  onCancel={cancelEditing}
                  onChange={changeEditForm}
                  onSubmit={handleUpdate}
                />
              </article>
            );
          }

          return (
            <article className={`activity-card activity-${activity.status.toLowerCase()}`} key={activity.id}>
              <div className="activity-date-block">
                <span>{activity.startsAt ? new Date(activity.startsAt).toLocaleDateString("en-GB", { day: "2-digit" }) : "—"}</span>
                <strong>{activity.startsAt ? new Date(activity.startsAt).toLocaleDateString("en-GB", { month: "short" }) : "TBD"}</strong>
              </div>
              <div className="activity-content">
                <div className="activity-title-row">
                  <div>
                    <span className={`activity-status status-${activity.status.toLowerCase()}`}>{statusLabel[activity.status]}</span>
                    <h3>{activity.title}</h3>
                  </div>
                  <span className="activity-author">Suggested by {activity.createdBy.displayName}</span>
                </div>
                <p className="activity-schedule">{formatSchedule(activity)}</p>
                {activity.location ? <p className="activity-location">{activity.location}</p> : null}
                {activity.description ? <p className="activity-description">{activity.description}</p> : null}
                <div className="activity-actions">
                  {tripRole === "OWNER" && activity.status !== "CONFIRMED" ? (
                    <button disabled={isWorking} onClick={() => void handleStatus(activity, "CONFIRMED")} type="button">Confirm</button>
                  ) : null}
                  {tripRole === "OWNER" && activity.status !== "PROPOSED" ? (
                    <button className="secondary-button" disabled={isWorking} onClick={() => void handleStatus(activity, "PROPOSED")} type="button">Mark proposed</button>
                  ) : null}
                  {tripRole === "OWNER" && activity.status !== "CANCELLED" ? (
                    <button className="secondary-button" disabled={isWorking} onClick={() => void handleStatus(activity, "CANCELLED")} type="button">Cancel activity</button>
                  ) : null}
                  {canEdit ? (
                    <button className="text-button" disabled={isWorking} onClick={() => startEditing(activity)} type="button">Edit</button>
                  ) : null}
                  {canEdit ? (
                    <button className="text-button danger-text" disabled={isWorking} onClick={() => void handleDelete(activity)} type="button">Delete</button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
