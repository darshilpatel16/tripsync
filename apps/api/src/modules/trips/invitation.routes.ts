import { Router } from "express";

import { requireAuthentication } from "../auth/auth.middleware.js";
import { invitationTokenParamsSchema } from "./trip.schemas.js";
import {
  getInvitationByToken,
  InvitationEmailMismatchError,
  InvitationNotFoundError,
  InvitationUnavailableError,
  respondToInvitation,
} from "./invitation.service.js";

export const invitationRouter = Router();

const readToken = (params: unknown) => invitationTokenParamsSchema.safeParse(params);

const sendInvitationError = (
  error: unknown,
  response: Parameters<Parameters<typeof invitationRouter.get>[1]>[1],
  next: (error?: unknown) => void,
) => {
  if (error instanceof InvitationNotFoundError) {
    response.status(404).json({
      error: { code: "INVITATION_NOT_FOUND", message: error.message },
    });
    return;
  }
  if (error instanceof InvitationEmailMismatchError) {
    response.status(403).json({
      error: { code: "INVITATION_EMAIL_MISMATCH", message: error.message },
    });
    return;
  }
  if (error instanceof InvitationUnavailableError) {
    response.status(409).json({
      error: { code: "INVITATION_UNAVAILABLE", message: error.message },
    });
    return;
  }
  next(error);
};

invitationRouter.get("/:token", async (request, response, next) => {
  const params = readToken(request.params);
  if (!params.success) {
    response.status(400).json({
      error: { code: "INVALID_INVITATION_TOKEN", message: "Invitation link is invalid" },
    });
    return;
  }

  try {
    const invitation = await getInvitationByToken(params.data.token);
    response.status(200).json({ data: { invitation } });
  } catch (error) {
    sendInvitationError(error, response, next);
  }
});

const respond = (decision: "ACCEPTED" | "DECLINED") =>
  async (
    request: Parameters<Parameters<typeof invitationRouter.post>[1]>[0],
    response: Parameters<Parameters<typeof invitationRouter.post>[1]>[1],
    next: (error?: unknown) => void,
  ) => {
    const params = readToken(request.params);
    if (!params.success) {
      response.status(400).json({
        error: { code: "INVALID_INVITATION_TOKEN", message: "Invitation link is invalid" },
      });
      return;
    }

    try {
      const result = await respondToInvitation(
        params.data.token,
        response.locals.user,
        decision,
      );
      response.status(200).json({ data: result });
    } catch (error) {
      sendInvitationError(error, response, next);
    }
  };

invitationRouter.post("/:token/accept", requireAuthentication, respond("ACCEPTED"));
invitationRouter.post("/:token/decline", requireAuthentication, respond("DECLINED"));
