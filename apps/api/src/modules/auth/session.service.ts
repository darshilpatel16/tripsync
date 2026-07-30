import { createHash, randomBytes } from "node:crypto";

import { prisma } from "../../lib/prisma.js";

export const SESSION_COOKIE_NAME = "tripsync_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const hashSessionToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const createSession = async (userId: string) => {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
};

export const findUserBySessionToken = async (token: string) => {
  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          createdAt: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.deleteMany({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  return session.user;
};

export const deleteSession = async (token: string) => {
  await prisma.session.deleteMany({
    where: {
      tokenHash: hashSessionToken(token),
    },
  });
};