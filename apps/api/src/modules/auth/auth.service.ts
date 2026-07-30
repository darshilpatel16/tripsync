import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";

import { prisma } from "../../lib/prisma.js";
import type { LoginBody, RegisterBody } from "./auth.schemas.js";

const dummyPasswordHashPromise = argon2.hash(
  "TripSync dummy password used only for timing protection",
  {
    type: argon2.argon2id,
  },
);

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with this email address already exists");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("The email address or password is incorrect");
    this.name = "InvalidCredentialsError";
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

export const loginUser = async (input: LoginBody) => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  const passwordHash = user?.passwordHash ?? (await dummyPasswordHashPromise);

  const passwordMatches = await argon2.verify(passwordHash, input.password);

  if (!user || !passwordMatches) {
    throw new InvalidCredentialsError();
  }

  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    createdAt: user.createdAt,
  };
};
