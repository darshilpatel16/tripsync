import "dotenv/config";

import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../lib/prisma.js";
import { registerUser } from "../auth/auth.service.js";
import { createTrip } from "./trip.service.js";
import {
  AlreadyTripMemberError,
  createTripInvitation,
  getInvitationByToken,
  InvitationEmailMismatchError,
  InvitationUnavailableError,
  respondToInvitation,
} from "./invitation.service.js";

const emails = {
  owner: "invitation-owner@tripsync.test",
  invitee: "invitation-invitee@tripsync.test",
  other: "invitation-other@tripsync.test",
};
let owner: { id: string; email: string };
let invitee: { id: string; email: string };
let other: { id: string; email: string };

const cleanTestData = async () => {
  await prisma.trip.deleteMany({ where: { createdBy: { email: emails.owner } } });
  await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
};

beforeEach(async () => {
  await cleanTestData();
  [owner, invitee, other] = await Promise.all([
    registerUser({ displayName: "Invitation Owner", email: emails.owner, password: "correct horse battery staple" }),
    registerUser({ displayName: "Invitation Invitee", email: emails.invitee, password: "correct horse battery staple" }),
    registerUser({ displayName: "Other User", email: emails.other, password: "correct horse battery staple" }),
  ]);
});

afterEach(cleanTestData);
afterAll(async () => prisma.$disconnect());

const createOwnerTrip = () =>
  createTrip(owner.id, {
    name: "Invitation Test Trip",
    destination: "Edinburgh",
    startDate: "2026-10-10",
    endDate: "2026-10-14",
    currency: "GBP",
  });

describe("trip invitations", () => {
  it("stores only a token hash and provides a local link without email config", async () => {
    const trip = await createOwnerTrip();
    const result = await createTripInvitation(owner.id, trip.id, invitee.email);

    expect(result.emailDelivery).toBe("DEVELOPMENT");
    expect(result.invitationUrl).toContain("/invitations/");
    const token = result.invitationUrl.split("/").at(-1)!;
    const stored = await prisma.tripInvitation.findUniqueOrThrow({
      where: { id: result.invitation.id },
    });
    expect(stored.tokenHash).not.toBe(token);
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("allows only the invited email to accept once", async () => {
    const trip = await createOwnerTrip();
    const created = await createTripInvitation(owner.id, trip.id, invitee.email);
    const token = created.invitationUrl.split("/").at(-1)!;

    await expect(
      respondToInvitation(token, other, "ACCEPTED"),
    ).rejects.toBeInstanceOf(InvitationEmailMismatchError);

    await expect(
      respondToInvitation(token, invitee, "ACCEPTED"),
    ).resolves.toMatchObject({ tripId: trip.id, status: "ACCEPTED" });

    await expect(
      prisma.tripMember.findUnique({
        where: { tripId_userId: { tripId: trip.id, userId: invitee.id } },
      }),
    ).resolves.toMatchObject({ role: "MEMBER" });

    await expect(
      respondToInvitation(token, invitee, "ACCEPTED"),
    ).rejects.toBeInstanceOf(InvitationUnavailableError);
  });

  it("supports declining without creating a membership", async () => {
    const trip = await createOwnerTrip();
    const created = await createTripInvitation(owner.id, trip.id, invitee.email);
    const token = created.invitationUrl.split("/").at(-1)!;

    await respondToInvitation(token, invitee, "DECLINED");
    await expect(
      prisma.tripMember.findUnique({
        where: { tripId_userId: { tripId: trip.id, userId: invitee.id } },
      }),
    ).resolves.toBeNull();
    await expect(getInvitationByToken(token)).resolves.toMatchObject({ status: "DECLINED" });
  });

  it("does not invite an existing trip member", async () => {
    const trip = await createOwnerTrip();
    await expect(
      createTripInvitation(owner.id, trip.id, owner.email),
    ).rejects.toBeInstanceOf(AlreadyTripMemberError);
  });
});
