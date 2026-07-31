import type { RequestHandler } from "express";

import {
  findUserBySessionToken,
  SESSION_COOKIE_NAME,
} from "./session.service.js";

export const requireAuthentication: RequestHandler = async (
  request,
  response,
  next,
) => {
  const sessionToken = request.cookies[SESSION_COOKIE_NAME];

  if (typeof sessionToken !== "string") {
    response.status(401).json({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "You must be signed in",
      },
    });

    return;
  }

  try {
    const user = await findUserBySessionToken(sessionToken);

    if (!user) {
      response.clearCookie(SESSION_COOKIE_NAME, {
        path: "/",
      });

      response.status(401).json({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "You must be signed in",
        },
      });

      return;
    }

    response.locals.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
