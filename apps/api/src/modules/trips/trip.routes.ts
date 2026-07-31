import { Router } from "express";

import { requireAuthentication } from "../auth/auth.middleware.js";
import {
  createTripBodySchema,
  invitationBodySchema,
  memberParamsSchema,
  tripIdParamsSchema,
  updateTripBodySchema,
} from "./trip.schemas.js";
import {
  AlreadyTripMemberError,
  createTripInvitation,
  listTripInvitations,
} from "./invitation.service.js";
import {
  CannotRemoveTripOwnerError,
  createTrip,
  deleteTrip,
  getTrip,
  listTrips,
  leaveTrip,
  removeTripMember,
  TripNotFoundError,
  TripOwnerRequiredError,
  updateTrip,
} from "./trip.service.js";

export const tripRouter = Router();

tripRouter.use(requireAuthentication);

const sendValidationError = (
  response: Parameters<Parameters<typeof tripRouter.post>[1]>[1],
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

const handleTripError = (
  error: unknown,
  response: Parameters<Parameters<typeof tripRouter.post>[1]>[1],
  next: (error?: unknown) => void,
) => {
  if (error instanceof TripNotFoundError) {
    response.status(404).json({
      error: { code: "TRIP_NOT_FOUND", message: error.message },
    });
    return;
  }
  if (error instanceof TripOwnerRequiredError) {
    response.status(403).json({
      error: { code: "TRIP_OWNER_REQUIRED", message: error.message },
    });
    return;
  }
  if (error instanceof CannotRemoveTripOwnerError) {
    response.status(409).json({
      error: { code: "TRIP_OWNER_CANNOT_LEAVE", message: error.message },
    });
    return;
  }
  if (error instanceof AlreadyTripMemberError) {
    response.status(409).json({
      error: { code: "ALREADY_TRIP_MEMBER", message: error.message },
    });
    return;
  }
  next(error);
};

tripRouter.get("/", async (_request, response, next) => {
  try {
    const trips = await listTrips(response.locals.user.id);
    response.status(200).json({ data: { trips } });
  } catch (error) {
    next(error);
  }
});

tripRouter.post("/", async (request, response, next) => {
  const result = createTripBodySchema.safeParse(request.body);
  if (!result.success) {
    sendValidationError(response, "The trip information is invalid", result.error.issues);
    return;
  }

  try {
    const trip = await createTrip(response.locals.user.id, result.data);
    response.status(201).json({ data: { trip } });
  } catch (error) {
    next(error);
  }
});

tripRouter.get("/:tripId", async (request, response, next) => {
  const params = tripIdParamsSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(response, "The trip ID is invalid", params.error.issues);
    return;
  }

  try {
    const trip = await getTrip(response.locals.user.id, params.data.tripId);
    response.status(200).json({ data: { trip } });
  } catch (error) {
    handleTripError(error, response, next);
  }
});

tripRouter.patch("/:tripId", async (request, response, next) => {
  const params = tripIdParamsSchema.safeParse(request.params);
  const body = updateTripBodySchema.safeParse(request.body);
  if (!params.success || !body.success) {
    const issues = [
      ...(params.success ? [] : params.error.issues),
      ...(body.success ? [] : body.error.issues),
    ];
    sendValidationError(response, "The trip update is invalid", issues);
    return;
  }

  try {
    const trip = await updateTrip(
      response.locals.user.id,
      params.data.tripId,
      body.data,
    );
    response.status(200).json({ data: { trip } });
  } catch (error) {
    if (error instanceof Error && error.message === "End date cannot be before start date") {
      sendValidationError(response, "The trip update is invalid", [
        { path: ["endDate"], message: error.message },
      ]);
      return;
    }
    handleTripError(error, response, next);
  }
});

tripRouter.delete("/:tripId", async (request, response, next) => {
  const params = tripIdParamsSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(response, "The trip ID is invalid", params.error.issues);
    return;
  }

  try {
    await deleteTrip(response.locals.user.id, params.data.tripId);
    response.status(204).send();
  } catch (error) {
    handleTripError(error, response, next);
  }
});

tripRouter.post("/:tripId/invitations", async (request, response, next) => {
  const params = tripIdParamsSchema.safeParse(request.params);
  const body = invitationBodySchema.safeParse(request.body);
  if (!params.success || !body.success) {
    const issues = [
      ...(params.success ? [] : params.error.issues),
      ...(body.success ? [] : body.error.issues),
    ];
    sendValidationError(response, "The invitation information is invalid", issues);
    return;
  }

  try {
    const result = await createTripInvitation(
      response.locals.user.id,
      params.data.tripId,
      body.data.email,
    );
    response.status(201).json({ data: result });
  } catch (error) {
    handleTripError(error, response, next);
  }
});

tripRouter.get("/:tripId/invitations", async (request, response, next) => {
  const params = tripIdParamsSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(response, "The trip ID is invalid", params.error.issues);
    return;
  }

  try {
    const invitations = await listTripInvitations(
      response.locals.user.id,
      params.data.tripId,
    );
    response.status(200).json({ data: { invitations } });
  } catch (error) {
    handleTripError(error, response, next);
  }
});

tripRouter.delete("/:tripId/members/:userId", async (request, response, next) => {
  const params = memberParamsSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(response, "The member information is invalid", params.error.issues);
    return;
  }

  try {
    await removeTripMember(
      response.locals.user.id,
      params.data.tripId,
      params.data.userId,
    );
    response.status(204).send();
  } catch (error) {
    handleTripError(error, response, next);
  }
});

tripRouter.post("/:tripId/leave", async (request, response, next) => {
  const params = tripIdParamsSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(response, "The trip ID is invalid", params.error.issues);
    return;
  }

  try {
    await leaveTrip(response.locals.user.id, params.data.tripId);
    response.status(204).send();
  } catch (error) {
    handleTripError(error, response, next);
  }
});
