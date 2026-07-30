import "dotenv/config";

import { afterAll, afterEach, describe, expect, it } from "vitest";

import { prisma } from "../../lib/prisma.js";
import { registerUser } from "./auth.service.js";
import {
  createSession,
  deleteSession,
  findUserBySessionToken,
} from "./session.service.js";

const testUserInput = {
  displayName: "TripSync Session Test",
  email: "session-service@tripsync.test",
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

describe("session service", () => {
  it("stores only a hash of the session token", async () => {
    const user = await registerUser(testUserInput);
    const session = await createSession(user.id);

    const storedSession = await prisma.session.findFirstOrThrow({
      where: {
        userId: user.id,
      },
    });

    expect(storedSession.tokenHash).not.toBe(session.token);
    expect(storedSession.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedSession.expiresAt).toEqual(session.expiresAt);
  });

  it("finds the user belonging to a valid session", async () => {
    const user = await registerUser(testUserInput);
    const session = await createSession(user.id);

    const sessionUser = await findUserBySessionToken(session.token);

    expect(sessionUser).toMatchObject({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
    });
  });

  it("deletes a session", async () => {
    const user = await registerUser(testUserInput);
    const session = await createSession(user.id);

    await deleteSession(session.token);

    await expect(
      findUserBySessionToken(session.token),
    ).resolves.toBeNull();
  });

  it("removes and rejects an expired session", async () => {
    const user = await registerUser(testUserInput);
    const session = await createSession(user.id);

    await prisma.session.updateMany({
      where: {
        userId: user.id,
      },
      data: {
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await expect(
      findUserBySessionToken(session.token),
    ).resolves.toBeNull();

    await expect(
      prisma.session.count({
        where: {
          userId: user.id,
        },
      }),
    ).resolves.toBe(0);
  });
});
