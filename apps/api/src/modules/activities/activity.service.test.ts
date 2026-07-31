import "dotenv/config";

import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../lib/prisma.js";
import { registerUser } from "../auth/auth.service.js";
import { createTrip, TripNotFoundError } from "../trips/trip.service.js";
import {
  ActivityEditorRequiredError,
  createActivity,
  deleteActivity,
  listActivities,
  updateActivity,
  updateActivityStatus,
} from "./activity.service.js";

const ownerEmail = "activity-owner@tripsync.test";
const creatorEmail = "activity-creator@tripsync.test";
const otherEmail = "activity-other@tripsync.test";
let ownerId: string;
let creatorId: string;
let otherId: string;
let tripId: string;

const cleanTestData = async () => {
  await prisma.trip.deleteMany({ where: { createdBy: { email: ownerEmail } } });
  await prisma.user.deleteMany({
    where: { email: { in: [ownerEmail, creatorEmail, otherEmail] } },
  });
};

beforeEach(async () => {
  await cleanTestData();
  const [owner, creator, other] = await Promise.all([
    registerUser({
      displayName: "Activity Owner",
      email: ownerEmail,
      password: "correct horse battery staple",
    }),
    registerUser({
      displayName: "Activity Creator",
      email: creatorEmail,
      password: "correct horse battery staple",
    }),
    registerUser({
      displayName: "Other Member",
      email: otherEmail,
      password: "correct horse battery staple",
    }),
  ]);
  ownerId = owner.id;
  creatorId = creator.id;
  otherId = other.id;
  const trip = await createTrip(ownerId, {
    name: "Activity Test Trip",
    destination: "Rome",
    startDate: "2026-09-10",
    endDate: "2026-09-17",
    currency: "EUR",
  });
  tripId = trip.id;
  await prisma.tripMember.create({
    data: { tripId, userId: creatorId, role: "MEMBER" },
  });
});

afterEach(cleanTestData);
afterAll(async () => prisma.$disconnect());

describe("activity service", () => {
  it("allows a trip member to propose and list activities", async () => {
    const activity = await createActivity(creatorId, tripId, {
      title: "Colosseum tour",
      location: "Rome",
      startsAt: "2026-09-12T09:00:00Z",
      endsAt: "2026-09-12T11:00:00Z",
    });

    expect(activity).toMatchObject({
      title: "Colosseum tour",
      status: "PROPOSED",
      createdBy: { id: creatorId },
    });
    await expect(listActivities(ownerId, tripId)).resolves.toEqual([
      expect.objectContaining({ id: activity.id }),
    ]);
  });

  it("hides activities from a user outside the trip", async () => {
    await expect(listActivities(otherId, tripId)).rejects.toBeInstanceOf(
      TripNotFoundError,
    );
  });

  it("allows creators to edit and delete their own activity", async () => {
    const activity = await createActivity(creatorId, tripId, {
      title: "Museum visit",
    });
    const updated = await updateActivity(creatorId, tripId, activity.id, {
      location: "Vatican Museums",
    });
    expect(updated.location).toBe("Vatican Museums");

    await deleteActivity(creatorId, tripId, activity.id);
    await expect(prisma.activity.findUnique({ where: { id: activity.id } })).resolves.toBeNull();
  });

  it("prevents another member from changing an activity they did not create", async () => {
    await prisma.tripMember.create({
      data: { tripId, userId: otherId, role: "MEMBER" },
    });
    const activity = await createActivity(creatorId, tripId, {
      title: "Creator's plan",
    });

    await expect(
      updateActivity(otherId, tripId, activity.id, { title: "Hijacked plan" }),
    ).rejects.toBeInstanceOf(ActivityEditorRequiredError);
    await expect(deleteActivity(otherId, tripId, activity.id)).rejects.toBeInstanceOf(
      ActivityEditorRequiredError,
    );
  });

  it("allows only the owner to confirm an activity and manage any proposal", async () => {
    const activity = await createActivity(creatorId, tripId, {
      title: "Group proposal",
    });

    await expect(
      updateActivityStatus(creatorId, tripId, activity.id, "CONFIRMED"),
    ).rejects.toThrow("Only the trip owner");

    const confirmed = await updateActivityStatus(
      ownerId,
      tripId,
      activity.id,
      "CONFIRMED",
    );
    expect(confirmed.status).toBe("CONFIRMED");

    const ownerEdit = await updateActivity(ownerId, tripId, activity.id, {
      title: "Confirmed group proposal",
    });
    expect(ownerEdit.title).toBe("Confirmed group proposal");
  });
});
