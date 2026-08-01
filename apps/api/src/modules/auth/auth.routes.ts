import { Router, type CookieOptions } from "express";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { createRateLimiter } from "../../middleware/rate-limit.js";
import { requireAuthentication } from "./auth.middleware.js";
import {
  createSession,
  deleteSession,
  SESSION_COOKIE_NAME,
} from "./session.service.js";

import {
  forgotPasswordBodySchema,
  avatarBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
} from "./auth.schemas.js";

import {
  createPasswordResetToken,
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  InvalidResetTokenError,
  loginUser,
  registerUser,
  resetPassword,
} from "./auth.service.js";

export const authRouter = Router();

authRouter.patch("/profile/avatar", requireAuthentication, async (request, response, next) => {
  const validationResult = avatarBodySchema.safeParse(request.body);

  if (!validationResult.success) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: validationResult.error.issues[0]?.message ?? "Invalid profile photo",
      },
    });
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { id: response.locals.user.id },
      data: { avatarDataUrl: validationResult.data.avatarDataUrl },
      select: { id: true, displayName: true, email: true, avatarDataUrl: true, createdAt: true },
    });
    response.json({ data: { user } });
  } catch (error) {
    next(error);
  }
});

const authenticationRateLimiter = createRateLimiter({
  maxRequests: env.NODE_ENV === "test" ? 1000 : 10,
  windowMs: 15 * 60 * 1000,
});

const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

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

authRouter.post("/login", authenticationRateLimiter, async (request, response, next) => {
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
      ...sessionCookieOptions,
      expires: session.expiresAt,
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

authRouter.post(
  "/forgot-password",
  authenticationRateLimiter,
  async (request, response, next) => {
    const validationResult = forgotPasswordBodySchema.safeParse(request.body);

    if (!validationResult.success) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Enter a valid email address",
          details: validationResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
      return;
    }

    try {
      const reset = await createPasswordResetToken(
        validationResult.data.email,
      );

      response.status(202).json({
        data: {
          message:
            "If an account exists for that email, password reset instructions have been created.",
          ...(env.NODE_ENV === "development" && reset
            ? { resetToken: reset.token }
            : {}),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  "/reset-password",
  authenticationRateLimiter,
  async (request, response, next) => {
    const validationResult = resetPasswordBodySchema.safeParse(request.body);

    if (!validationResult.success) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "The password reset information is invalid",
          details: validationResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
      return;
    }

    try {
      await resetPassword(validationResult.data);
      response.status(204).send();
    } catch (error) {
      if (error instanceof InvalidResetTokenError) {
        response.status(400).json({
          error: {
            code: "INVALID_RESET_TOKEN",
            message: error.message,
          },
        });
        return;
      }

      next(error);
    }
  },
);

authRouter.get(
  "/me",
  requireAuthentication,
  (_request, response) => {
    response.status(200).json({
      data: {
        user: response.locals.user,
      },
    });
  },
);

authRouter.post("/logout", async (request, response, next) => {
  const sessionToken = request.cookies[SESSION_COOKIE_NAME];

  try {
    if (typeof sessionToken === "string") {
      await deleteSession(sessionToken);
    }

    response.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
