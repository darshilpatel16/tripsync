import { createHash, randomBytes } from "node:crypto";

import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { sendInvitationEmail } from "../email/email.service.js";
import { requireTripOwner } from "./trip.service.js";

const INVITATION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const hashInvitationToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export class InvitationNotFoundError extends Error {
  constructor() {
    super("Invitation was not found");
    this.name = "InvitationNotFoundError";
  }
}

export class InvitationUnavailableError extends Error {
  constructor() {
    super("This invitation is no longer available");
    this.name = "InvitationUnavailableError";
  }
}

export class InvitationEmailMismatchError extends Error {
  constructor() {
    super("Sign in with the email address that received this invitation");
    this.name = "InvitationEmailMismatchError";
  }
}

export class AlreadyTripMemberError extends Error {
  constructor() {
    super("This person is already a member of the trip");
    this.name = "AlreadyTripMemberError";
  }
}

const invitationSelection = {
  id: true,
  email: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  trip: {
    select: {
      id: true,
      name: true,
      destination: true,
      startDate: true,
      endDate: true,
    },
  },
  invitedBy: {
    select: { id: true, displayName: true },
  },
} as const;

export const createTripInvitation = async (
  ownerId: string,
  tripId: string,
  email: string,
) => {
  await requireTripOwner(ownerId, tripId);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    const membership = await prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: existingUser.id } },
      select: { id: true },
    });
    if (membership) {
      throw new AlreadyTripMemberError();
    }
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(Date.now() + INVITATION_DURATION_MS);

  const invitation = await prisma.tripInvitation.upsert({
    where: { tripId_email: { tripId, email } },
    create: {
      tripId,
      email,
      tokenHash,
      invitedById: ownerId,
      expiresAt,
    },
    update: {
      tokenHash,
      invitedById: ownerId,
      expiresAt,
      status: "PENDING",
    },
    select: invitationSelection,
  });

  const invitationUrl = `${env.WEB_ORIGIN}/invitations/${encodeURIComponent(token)}`;
  const emailDelivery = await sendInvitationEmail({
    invitationId: invitation.id,
    recipientEmail: invitation.email,
    inviterName: invitation.invitedBy.displayName,
    tripName: invitation.trip.name,
    destination: invitation.trip.destination,
    invitationUrl,
  });

  return { invitation, invitationUrl, emailDelivery };
};

export const listTripInvitations = async (ownerId: string, tripId: string) => {
  await requireTripOwner(ownerId, tripId);
  const now = new Date();

  await prisma.tripInvitation.updateMany({
    where: { tripId, status: "PENDING", expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });

  return prisma.tripInvitation.findMany({
    where: { tripId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
  });
};

export const getInvitationByToken = async (token: string) => {
  const invitation = await prisma.tripInvitation.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
    select: invitationSelection,
  });

  if (!invitation) {
    throw new InvitationNotFoundError();
  }

  if (invitation.status === "PENDING" && invitation.expiresAt <= new Date()) {
    return prisma.tripInvitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
      select: invitationSelection,
    });
  }

  return invitation;
};

export const respondToInvitation = async (
  token: string,
  user: { id: string; email: string },
  decision: "ACCEPTED" | "DECLINED",
) => {
  const tokenHash = hashInvitationToken(token);
  const invitation = await prisma.tripInvitation.findUnique({
    where: { tokenHash },
    select: { id: true, tripId: true, email: true, status: true, expiresAt: true },
  });

  if (!invitation) {
    throw new InvitationNotFoundError();
  }
  if (invitation.email !== user.email) {
    throw new InvitationEmailMismatchError();
  }
  if (invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) {
    throw new InvitationUnavailableError();
  }

  await prisma.$transaction(async (transaction) => {
    const claimed = await transaction.tripInvitation.updateMany({
      where: {
        id: invitation.id,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      data: { status: decision },
    });

    if (claimed.count !== 1) {
      throw new InvitationUnavailableError();
    }

    if (decision === "ACCEPTED") {
      await transaction.tripMember.upsert({
        where: { tripId_userId: { tripId: invitation.tripId, userId: user.id } },
        create: { tripId: invitation.tripId, userId: user.id, role: "MEMBER" },
        update: {},
      });
    }
  });

  return { tripId: invitation.tripId, status: decision };
};
