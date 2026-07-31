import type { ActivityStatus, Prisma, TripRole } from "@prisma/client";

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
  votes: {
    select: {
      value: true,
      user: { select: { id: true, displayName: true } },
    },
  },
  trip: {
    select: {
      members: {
        select: {
          user: { select: { id: true, displayName: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  },
} as const;

type SelectedActivity = Prisma.ActivityGetPayload<{
  select: typeof activitySelection;
}>;

const presentActivity = (activity: SelectedActivity, currentUserId: string) => {
  const { votes, trip, ...details } = activity;
  const memberUsers = trip.members.map((member) => member.user);
  const memberUserIds = new Set(memberUsers.map((user) => user.id));
  const activeVotes = votes.filter(
    (vote) => vote.value === "UP" && memberUserIds.has(vote.user.id),
  );
  const votedUserIds = new Set(
    activeVotes.map((vote) => vote.user.id),
  );

  return {
    ...details,
    voting: {
      voted: activeVotes.map((vote) => vote.user),
      notVoted: memberUsers.filter((user) => !votedUserIds.has(user.id)),
      currentUserVoted: votedUserIds.has(currentUserId),
    },
  };
};

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

  const activity = await prisma.activity.create({
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
  return presentActivity(activity, userId);
};

export const listActivities = async (userId: string, tripId: string) => {
  await requireTripMember(userId, tripId);

  const activities = await prisma.activity.findMany({
    where: { tripId },
    orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
    select: activitySelection,
  });
  return activities.map((activity) => presentActivity(activity, userId));
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

  const activity = await prisma.activity.update({
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
  return presentActivity(activity, userId);
};

export const updateActivityStatus = async (
  userId: string,
  tripId: string,
  activityId: string,
  status: ActivityStatus,
) => {
  await requireTripOwner(userId, tripId);
  await findActivity(tripId, activityId);

  const activity = await prisma.activity.update({
    where: { id: activityId },
    data: { status },
    select: activitySelection,
  });
  return presentActivity(activity, userId);
};

export const addActivityVote = async (
  userId: string,
  tripId: string,
  activityId: string,
) => {
  await requireTripMember(userId, tripId);
  await findActivity(tripId, activityId);

  await prisma.activityVote.upsert({
    where: { activityId_userId: { activityId, userId } },
    create: { activityId, userId, value: "UP" },
    update: { value: "UP" },
  });

  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    select: activitySelection,
  });
  return presentActivity(activity, userId);
};

export const removeActivityVote = async (
  userId: string,
  tripId: string,
  activityId: string,
) => {
  await requireTripMember(userId, tripId);
  await findActivity(tripId, activityId);

  await prisma.activityVote.deleteMany({ where: { activityId, userId } });

  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    select: activitySelection,
  });
  return presentActivity(activity, userId);
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
