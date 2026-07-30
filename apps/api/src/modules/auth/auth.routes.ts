import { Router } from "express";

import { env } from "../../config/env.js";

import {
  createSession,
  SESSION_COOKIE_NAME,
} from "./session.service.js";

import {
  loginBodySchema,
  registerBodySchema,
} from "./auth.schemas.js";

import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  loginUser,
  registerUser,
} from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/register", async (request, response, next) => {
  const validationResult = registerBodySchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The registration information is invalid",
        details: validationResult.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });

    return;
  }

  try {
    const user = await registerUser(validationResult.data);

    response.status(201).json({
      data: {
        user,
      },
    });
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      response.status(409).json({
        error: {
          code: "EMAIL_ALREADY_REGISTERED",
          message: error.message,
        },
      });

      return;
    }

    next(error);
  }
});

authRouter.post("/login", async (request, response, next) => {
  const validationResult = loginBodySchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The login information is invalid",
        details: validationResult.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });

    return;
  }

  try {
    const user = await loginUser(validationResult.data);
const session = await createSession(user.id);

response.cookie(SESSION_COOKIE_NAME, session.token, {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  expires: session.expiresAt,
  path: "/",
});

response.status(200).json({
      data: {
        user,
      },
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      response.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: error.message,
        },
      });

      return;
    }

    next(error);
  }
});