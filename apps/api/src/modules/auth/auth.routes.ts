import { Router } from "express";

import { registerBodySchema } from "./auth.schemas.js";
import {
  EmailAlreadyRegisteredError,
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
