import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";

import { prisma } from "../../lib/prisma.js";
import type { RegisterBody } from "./auth.schemas.js";

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with this email address already exists");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export const registerUser = async (input: RegisterBody) => {
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
  });

  try {
    return await prisma.user.create({
      data: {
        displayName: input.displayName,
        email: input.email,
        passwordHash,
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new EmailAlreadyRegisteredError();
    }

    throw error;
  }
};
