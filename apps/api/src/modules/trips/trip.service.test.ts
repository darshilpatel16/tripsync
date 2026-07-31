import "dotenv/config";

import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../lib/prisma.js";
import { registerUser } from "../auth/auth.service.js";
import {
  createTrip,
  deleteTrip,
  getTrip,
  listTrips,
  TripNotFoundError,
  TripOwnerRequiredError,
  updateTrip,
} from "./trip.service.js";

const ownerEmail = "trip-owner@tripsync.test";
const memberEmail = "trip-member@tripsync.test";
let ownerId: string;
let memberId: string;

const cleanTestData = async () => {
  await prisma.trip.deleteMany({
    where: { createdBy: { email: { in: [ownerEmail, memberEmail] } } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [ownerEmail, memberEmail] } },
  });
};

const tripInput = {
  name: "Summer in Italy",
  destination: "Rome, Italy",
  startDate: "2026-09-10",
  endDate: "2026-09-17",
  currency: "EUR",
};

beforeEach(async () => {
  await cleanTestData();
  const [owner, member] = await Promise.all([
    registerUser({
      displayName: "Trip Owner",
      email: ownerEmail,
      password: "correct horse battery staple",
    }),
    registerUser({
      displayName: "Trip Member",
      email: memberEmail,
      password: "correct horse battery staple",
    }),
  ]);
  ownerId = owner.id;
  memberId = member.id;
});

afterEach(async () => {
  await cleanTestData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("trip service", () => {
  it("creates a trip and owner membership atomically", async () => {
    const trip = await createTrip(ownerId, tripInput);

    expect(trip).toMatchObject({
      name: tripInput.name,
      role: "OWNER",
      memberCount: 1,
    });
    await expect(
      prisma.tripMember.findUnique({
        where: { tripId_userId: { tripId: trip.id, userId: ownerId } },
      }),
    ).resolves.toMatchObject({ role: "OWNER" });
  });

  it("lists only trips belonging to the user", async () => {
    const ownerTrip = await createTrip(ownerId, tripInput);
    await createTrip(memberId, { ...tripInput, name: "Member private trip" });

    await expect(listTrips(ownerId)).resolves.toEqual([
      expect.objectContaining({ id: ownerTrip.id, role: "OWNER" }),
    ]);
  });

  it("hides a private trip from a stranger", async () => {
    const trip = await createTrip(ownerId, tripInput);
    await expect(getTrip(memberId, trip.id)).rejects.toBeInstanceOf(
      TripNotFoundError,
    );
  });

  it("allows only the owner to update and delete a trip", async () => {
    const trip = await createTrip(ownerId, tripInput);
    await prisma.tripMember.create({
      data: { tripId: trip.id, userId: memberId, role: "MEMBER" },
    });

    await expect(
      updateTrip(memberId, trip.id, { name: "Not allowed" }),
    ).rejects.toBeInstanceOf(TripOwnerRequiredError);

    const updatedTrip = await updateTrip(ownerId, trip.id, {
      name: "Italian Adventure",
    });
    expect(updatedTrip.name).toBe("Italian Adventure");

    await deleteTrip(ownerId, trip.id);
    await expect(prisma.trip.findUnique({ where: { id: trip.id } })).resolves.toBeNull();
  });
});
