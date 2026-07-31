import "dotenv/config";

import { createHash } from "node:crypto";
import * as argon2 from "argon2";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { prisma } from "../../lib/prisma.js";
import type { RegisterBody } from "./auth.schemas.js";
import {
  createPasswordResetToken,
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  InvalidResetTokenError,
  loginUser,
  registerUser,
  resetPassword,
} from "./auth.service.js";
import { createSession } from "./session.service.js";

const testUserInput: RegisterBody = {
  displayName: "TripSync Test User",
  email: "auth-service@tripsync.test",
  password: "correct horse battery staple",
};

afterEach(async () => {
  await prisma.user.deleteMany({
    where: {
      email: testUserInput.email,
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("registerUser", () => {
  it("creates a user with a secure password hash", async () => {
    const user = await registerUser(testUserInput);

    const storedUser = await prisma.user.findUniqueOrThrow({
      where: {
        email: testUserInput.email,
      },
    });

    expect(user).toMatchObject({
      displayName: testUserInput.displayName,
      email: testUserInput.email,
    });

    expect(user).not.toHaveProperty("passwordHash");
    expect(storedUser.passwordHash).not.toBe(testUserInput.password);

    await expect(
      argon2.verify(storedUser.passwordHash, testUserInput.password),
    ).resolves.toBe(true);
  });

  it("rejects a duplicate email address", async () => {
    await registerUser(testUserInput);

    await expect(registerUser(testUserInput)).rejects.toBeInstanceOf(
      EmailAlreadyRegisteredError,
    );
  });
});

describe("loginUser", () => {
  it("returns safe user information for correct credentials", async () => {
    await registerUser(testUserInput);

    const user = await loginUser({
      email: testUserInput.email,
      password: testUserInput.password,
    });

    expect(user).toMatchObject({
      displayName: testUserInput.displayName,
      email: testUserInput.email,
    });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("rejects an incorrect password", async () => {
    await registerUser(testUserInput);

    await expect(
      loginUser({
        email: testUserInput.email,
        password: "this password is incorrect",
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("rejects an unknown email address", async () => {
    await expect(
      loginUser({
        email: "unknown-user@tripsync.test",
        password: "correct horse battery staple",
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});

describe("password reset service", () => {
  it("stores only a hash of the password reset token", async () => {
    const user = await registerUser(testUserInput);
    const reset = await createPasswordResetToken(user.email);

    expect(reset).not.toBeNull();

    const storedToken = await prisma.passwordResetToken.findFirstOrThrow({
      where: { userId: user.id },
    });

    expect(storedToken.tokenHash).not.toBe(reset?.token);
    expect(storedToken.tokenHash).toBe(
      createHash("sha256").update(reset!.token).digest("hex"),
    );
  });

  it("changes the password, consumes the token, and signs out old sessions", async () => {
    const user = await registerUser(testUserInput);
    await createSession(user.id);
    const reset = await createPasswordResetToken(user.email);

    await resetPassword({
      token: reset!.token,
      password: "the replacement secure password",
    });

    await expect(
      loginUser({
        email: user.email,
        password: "the replacement secure password",
      }),
    ).resolves.toMatchObject({ id: user.id });
    await expect(
      prisma.session.count({ where: { userId: user.id } }),
    ).resolves.toBe(0);
    await expect(
      resetPassword({
        token: reset!.token,
        password: "another replacement password",
      }),
    ).rejects.toBeInstanceOf(InvalidResetTokenError);
  });

  it("does not reveal whether an email address exists", async () => {
    await expect(
      createPasswordResetToken("unknown-user@tripsync.test"),
    ).resolves.toBeNull();
  });
});
