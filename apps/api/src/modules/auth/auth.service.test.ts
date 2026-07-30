import "dotenv/config";

import * as argon2 from "argon2";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { prisma } from "../../lib/prisma.js";
import type { RegisterBody } from "./auth.schemas.js";
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  loginUser,
  registerUser,
} from "./auth.service.js";

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