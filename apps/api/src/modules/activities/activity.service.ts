import type { ActivityStatus, TripRole } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";
import { TripNotFoundError, requireTripOwner } from "../trips/trip.service.js";
import type {
  CreateActivityBody,
  UpdateActivityBody,
} from "./activity.schemas.js";

export class ActivityNotFoundError extends Error {
  constructor() {
    super("Activity was not found");
    this.name = "ActivityNotFoundError";
  }
}

export class ActivityEditorRequiredError extends Error {
  constructor() {
    super("Only the activity creator or trip owner can perform this action");
    this.name = "ActivityEditorRequiredError";
  }
}

export class ActivityScheduleError extends Error {
  constructor() {
    super("End time requires a start time and cannot be before it");
    this.name = "ActivityScheduleError";
  }
}

const activitySelection = {
  id: true,
  tripId: true,
  title: true,
  description: true,
  location: true,
  startsAt: true,
  endsAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: { id: true, displayName: true },
  },
} as const;

const requireTripMember = async (userId: string, tripId: string) => {
  const membership = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId } },
    select: { role: true },
  });

  if (!membership) {
    throw new TripNotFoundError();
  }

  return membership.role;
};

const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value);

const findActivity = async (tripId: string, activityId: string) => {
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, tripId },
    select: {
      id: true,
      createdById: true,
      startsAt: true,
      endsAt: true,
    },
  });

  if (!activity) {
    throw new ActivityNotFoundError();
  }

  return activity;
};

const requireActivityEditor = (
  role: TripRole,
  userId: string,
  createdById: string,
) => {
  if (role !== "OWNER" && userId !== createdById) {
    throw new ActivityEditorRequiredError();
  }
};

export const createActivity = async (
  userId: string,
  tripId: string,
  input: CreateActivityBody,
) => {
  await requireTripMember(userId, tripId);

  return prisma.activity.create({
    data: {
      tripId,
      createdById: userId,
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      startsAt: toDate(input.startsAt) ?? null,
      endsAt: toDate(input.endsAt) ?? null,
    },
    select: activitySelection,
  });
};

export const listActivities = async (userId: string, tripId: string) => {
  await requireTripMember(userId, tripId);

  return prisma.activity.findMany({
    where: { tripId },
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
    select: activitySelection,
  });
};

export const updateActivity = async (
  userId: string,
  tripId: string,
  activityId: string,
  input: UpdateActivityBody,
) => {
  const role = await requireTripMember(userId, tripId);
  const existing = await findActivity(tripId, activityId);
  requireActivityEditor(role, userId, existing.createdById);

  const startsAt = input.startsAt === undefined
    ? existing.startsAt
    : toDate(input.startsAt) ?? null;
  const endsAt = input.endsAt === undefined
    ? existing.endsAt
    : toDate(input.endsAt) ?? null;

  if (endsAt && (!startsAt || endsAt < startsAt)) {
    throw new ActivityScheduleError();
  }

  return prisma.activity.update({
    where: { id: activityId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.startsAt !== undefined ? { startsAt } : {}),
      ...(input.endsAt !== undefined ? { endsAt } : {}),
    },
    select: activitySelection,
  });
};

export const updateActivityStatus = async (
  userId: string,
  tripId: string,
  activityId: string,
  status: ActivityStatus,
) => {
  await requireTripOwner(userId, tripId);
  await findActivity(tripId, activityId);

  return prisma.activity.update({
    where: { id: activityId },
    data: { status },
    select: activitySelection,
  });
};

export const deleteActivity = async (
  userId: string,
  tripId: string,
  activityId: string,
) => {
  const role = await requireTripMember(userId, tripId);
  const activity = await findActivity(tripId, activityId);
  requireActivityEditor(role, userId, activity.createdById);
  await prisma.activity.delete({ where: { id: activityId } });
};
