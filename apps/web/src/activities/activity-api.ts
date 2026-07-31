import { apiRequest } from "../lib/api";
import type { Activity, ActivityInput, ActivityStatus } from "./activity-types";

export const listActivities = async (tripId: string) => {
  const response = await apiRequest<{ data: { activities: Activity[] } }>(
    `/trips/${tripId}/activities`,
  );
  return response.data.activities;
};

export const createActivity = async (tripId: string, input: ActivityInput) => {
  const response = await apiRequest<{ data: { activity: Activity } }>(
    `/trips/${tripId}/activities`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return response.data.activity;
};

export const updateActivity = async (
  tripId: string,
  activityId: string,
  input: ActivityInput,
) => {
  const response = await apiRequest<{ data: { activity: Activity } }>(
    `/trips/${tripId}/activities/${activityId}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
  return response.data.activity;
};

export const updateActivityStatus = async (
  tripId: string,
  activityId: string,
  status: ActivityStatus,
) => {
  const response = await apiRequest<{ data: { activity: Activity } }>(
    `/trips/${tripId}/activities/${activityId}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
  return response.data.activity;
};

export const deleteActivity = (tripId: string, activityId: string) =>
  apiRequest<void>(`/trips/${tripId}/activities/${activityId}`, {
    method: "DELETE",
  });
