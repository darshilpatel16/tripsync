import type { TripRole } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";
import type { CreateTripBody, UpdateTripBody } from "./trip.schemas.js";

export class TripNotFoundError extends Error {
  constructor() {
    super("Trip was not found");
    this.name = "TripNotFoundError";
  }
}

export class TripOwnerRequiredError extends Error {
  constructor() {
    super("Only the trip owner can perform this action");
    this.name = "TripOwnerRequiredError";
  }
}

const toDatabaseDate = (value: string) =>
  new Date(`${value}T00:00:00.000Z`);

const tripSummarySelection = (userId: string) => ({
  id: true,
  name: true,
  destination: true,
  startDate: true,
  endDate: true,
  currency: true,
  budgetMinor: true,
  createdAt: true,
  updatedAt: true,
  members: {
    where: { userId },
    select: { role: true },
  },
  _count: { select: { members: true } },
});

const formatTripSummary = <T extends {
  members: Array<{ role: TripRole }>;
  _count: { members: number };
}>(trip: T) => {
  const { members, _count, ...details } = trip;
  const membership = members[0];

  if (!membership) {
    throw new TripNotFoundError();
  }

  return {
    ...details,
    role: membership.role,
    memberCount: _count.members,
  };
};

export const createTrip = async (userId: string, input: CreateTripBody) => {
  const trip = await prisma.trip.create({
    data: {
      name: input.name,
      destination: input.destination,
      startDate: toDatabaseDate(input.startDate),
      endDate: toDatabaseDate(input.endDate),
      currency: input.currency,
      budgetMinor: input.budgetMinor ?? null,
      createdById: userId,
      members: {
        create: { userId, role: "OWNER" },
      },
    },
    select: tripSummarySelection(userId),
  });

  return formatTripSummary(trip);
};

export const listTrips = async (userId: string) => {
  const trips = await prisma.trip.findMany({
    where: { members: { some: { userId } } },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    select: tripSummarySelection(userId),
  });

  return trips.map(formatTripSummary);
};

export const getTrip = async (userId: string, tripId: string) => {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, members: { some: { userId } } },
    select: {
      id: true,
      name: true,
      destination: true,
      startDate: true,
      endDate: true,
      currency: true,
      budgetMinor: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { members: true } },
      members: {
        orderBy: { joinedAt: "asc" },
        select: {
          role: true,
          joinedAt: true,
          user: { select: { id: true, displayName: true, email: true, avatarDataUrl: true } },
        },
      },
    },
  });

  if (!trip) {
    throw new TripNotFoundError();
  }

  const currentMembership = trip.members.find(
    (membership) => membership.user.id === userId,
  );

  if (!currentMembership) {
    throw new TripNotFoundError();
  }

  const { _count, ...details } = trip;
  return {
    ...details,
    role: currentMembership.role,
    memberCount: _count.members,
  };
};

export const requireTripOwner = async (userId: string, tripId: string) => {
  const membership = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId } },
    select: { role: true },
  });

  if (!membership) {
    throw new TripNotFoundError();
  }
  if (membership.role !== "OWNER") {
    throw new TripOwnerRequiredError();
  }
};

export const updateTrip = async (
  userId: string,
  tripId: string,
  input: UpdateTripBody,
) => {
  await requireTripOwner(userId, tripId);

  const existingTrip = await prisma.trip.findUniqueOrThrow({
    where: { id: tripId },
    select: { startDate: true, endDate: true },
  });
  const startDate = input.startDate
    ? toDatabaseDate(input.startDate)
    : existingTrip.startDate;
  const endDate = input.endDate
    ? toDatabaseDate(input.endDate)
    : existingTrip.endDate;

  if (endDate < startDate) {
    throw new Error("End date cannot be before start date");
  }

  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.destination ? { destination: input.destination } : {}),
      ...(input.startDate ? { startDate } : {}),
      ...(input.endDate ? { endDate } : {}),
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.budgetMinor !== undefined
        ? { budgetMinor: input.budgetMinor }
        : {}),
    },
    select: tripSummarySelection(userId),
  });

  return formatTripSummary(trip);
};

export const deleteTrip = async (userId: string, tripId: string) => {
  await requireTripOwner(userId, tripId);
  await prisma.trip.delete({ where: { id: tripId } });
};

export class CannotRemoveTripOwnerError extends Error {
  constructor() {
    super("The trip owner cannot be removed or leave the trip");
    this.name = "CannotRemoveTripOwnerError";
  }
}

export const removeTripMember = async (
  ownerId: string,
  tripId: string,
  memberUserId: string,
) => {
  await requireTripOwner(ownerId, tripId);

  const membership = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: memberUserId } },
    select: { role: true },
  });

  if (!membership) {
    throw new TripNotFoundError();
  }
  if (membership.role === "OWNER") {
    throw new CannotRemoveTripOwnerError();
  }

  await prisma.tripMember.delete({
    where: { tripId_userId: { tripId, userId: memberUserId } },
  });
};

export const leaveTrip = async (userId: string, tripId: string) => {
  const membership = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId } },
    select: { role: true },
  });

  if (!membership) {
    throw new TripNotFoundError();
  }
  if (membership.role === "OWNER") {
    throw new CannotRemoveTripOwnerError();
  }

  await prisma.tripMember.delete({
    where: { tripId_userId: { tripId, userId } },
  });
};
