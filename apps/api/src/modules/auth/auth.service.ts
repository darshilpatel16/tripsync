import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";

import { prisma } from "../../lib/prisma.js";
import type {
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
} from "./auth.schemas.js";

export const PASSWORD_RESET_DURATION_MS = 30 * 60 * 1000;

const hashResetToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

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

export class InvalidResetTokenError extends Error {
  constructor() {
    super("This password reset link is invalid or has expired");
    this.name = "InvalidResetTokenError";
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

export const createPasswordResetToken = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_DURATION_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    }),
  ]);

  return { token, expiresAt };
};

export const resetPassword = async (input: ResetPasswordBody) => {
  const tokenHash = hashResetToken(input.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt <= new Date()
  ) {
    throw new InvalidResetTokenError();
  }

  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
  });
  const now = new Date();

  await prisma.$transaction(async (transaction) => {
    const consumedToken = await transaction.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (consumedToken.count !== 1) {
      throw new InvalidResetTokenError();
    }

    await transaction.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    await transaction.session.deleteMany({
      where: { userId: resetToken.userId },
    });

    await transaction.passwordResetToken.deleteMany({
      where: {
        userId: resetToken.userId,
        id: { not: resetToken.id },
      },
    });
  });
};
