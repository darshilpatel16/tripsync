import { Router } from "express";

import { requireAuthentication } from "../auth/auth.middleware.js";
import { TripNotFoundError, TripOwnerRequiredError } from "../trips/trip.service.js";
import {
  activityParamsSchema,
  activityStatusBodySchema,
  activityTripParamsSchema,
  createActivityBodySchema,
  updateActivityBodySchema,
} from "./activity.schemas.js";
import {
  ActivityEditorRequiredError,
  ActivityNotFoundError,
  ActivityScheduleError,
  addActivityVote,
  createActivity,
  deleteActivity,
  listActivities,
  removeActivityVote,
  updateActivity,
  updateActivityStatus,
} from "./activity.service.js";

export const activityRouter = Router({ mergeParams: true });

activityRouter.use(requireAuthentication);

const sendValidationError = (
  response: Parameters<Parameters<typeof activityRouter.post>[1]>[1],
  message: string,
  issues: Array<{ path: PropertyKey[]; message: string }>,
) => {
  response.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message,
      details: issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
  });
};

const handleActivityError = (
  error: unknown,
  response: Parameters<Parameters<typeof activityRouter.post>[1]>[1],
  next: (error?: unknown) => void,
) => {
  if (error instanceof TripNotFoundError || error instanceof ActivityNotFoundError) {
    response.status(404).json({
      error: { code: "ACTIVITY_NOT_FOUND", message: "Activity was not found" },
    });
    return;
  }
  if (
    error instanceof TripOwnerRequiredError ||
    error instanceof ActivityEditorRequiredError
  ) {
    response.status(403).json({
      error: { code: "ACTIVITY_PERMISSION_REQUIRED", message: error.message },
    });
    return;
  }
  if (error instanceof ActivityScheduleError) {
    sendValidationError(response, "The activity schedule is invalid", [
      { path: ["endsAt"], message: error.message },
    ]);
    return;
  }
  next(error);
};

activityRouter.get("/", async (request, response, next) => {
  const params = activityTripParamsSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(response, "The trip ID is invalid", params.error.issues);
    return;
  }

  try {
    const activities = await listActivities(response.locals.user.id, params.data.tripId);
    response.status(200).json({ data: { activities } });
  } catch (error) {
    handleActivityError(error, response, next);
  }
});

activityRouter.post("/", async (request, response, next) => {
  const params = activityTripParamsSchema.safeParse(request.params);
  const body = createActivityBodySchema.safeParse(request.body);
  if (!params.success || !body.success) {
    const issues = [
      ...(params.success ? [] : params.error.issues),
      ...(body.success ? [] : body.error.issues),
    ];
    sendValidationError(response, "The activity information is invalid", issues);
    return;
  }

  try {
    const activity = await createActivity(
      response.locals.user.id,
      params.data.tripId,
      body.data,
    );
    response.status(201).json({ data: { activity } });
  } catch (error) {
    handleActivityError(error, response, next);
  }
});

activityRouter.patch("/:activityId", async (request, response, next) => {
  const params = activityParamsSchema.safeParse(request.params);
  const body = updateActivityBodySchema.safeParse(request.body);
  if (!params.success || !body.success) {
    const issues = [
      ...(params.success ? [] : params.error.issues),
      ...(body.success ? [] : body.error.issues),
    ];
    sendValidationError(response, "The activity update is invalid", issues);
    return;
  }

  try {
    const activity = await updateActivity(
      response.locals.user.id,
      params.data.tripId,
      params.data.activityId,
      body.data,
    );
    response.status(200).json({ data: { activity } });
  } catch (error) {
    handleActivityError(error, response, next);
  }
});

activityRouter.patch("/:activityId/status", async (request, response, next) => {
  const params = activityParamsSchema.safeParse(request.params);
  const body = activityStatusBodySchema.safeParse(request.body);
  if (!params.success || !body.success) {
    const issues = [
      ...(params.success ? [] : params.error.issues),
      ...(body.success ? [] : body.error.issues),
    ];
    sendValidationError(response, "The activity status is invalid", issues);
    return;
  }

  try {
    const activity = await updateActivityStatus(
      response.locals.user.id,
      params.data.tripId,
      params.data.activityId,
      body.data.status,
    );
    response.status(200).json({ data: { activity } });
  } catch (error) {
    handleActivityError(error, response, next);
  }
});

activityRouter.post("/:activityId/vote", async (request, response, next) => {
  const params = activityParamsSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(response, "The activity ID is invalid", params.error.issues);
    return;
  }

  try {
    const activity = await addActivityVote(
      response.locals.user.id,
      params.data.tripId,
      params.data.activityId,
    );
    response.status(200).json({ data: { activity } });
  } catch (error) {
    handleActivityError(error, response, next);
  }
});

activityRouter.delete("/:activityId/vote", async (request, response, next) => {
  const params = activityParamsSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(response, "The activity ID is invalid", params.error.issues);
    return;
  }

  try {
    const activity = await removeActivityVote(
      response.locals.user.id,
      params.data.tripId,
      params.data.activityId,
    );
    response.status(200).json({ data: { activity } });
  } catch (error) {
    handleActivityError(error, response, next);
  }
});

activityRouter.delete("/:activityId", async (request, response, next) => {
  const params = activityParamsSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(response, "The activity ID is invalid", params.error.issues);
    return;
  }

  try {
    await deleteActivity(
      response.locals.user.id,
      params.data.tripId,
      params.data.activityId,
    );
    response.status(204).send();
  } catch (error) {
    handleActivityError(error, response, next);
  }
});
