import { prisma } from "../../lib/prisma.js";
import { TripNotFoundError } from "../trips/trip.service.js";
import type { CreateExpenseBody } from "./expense.schemas.js";

export class ExpenseMemberError extends Error {
  constructor() {
    super("The payer and every participant must be current trip members");
    this.name = "ExpenseMemberError";
  }
}

const expenseSelection = {
  id: true,
  tripId: true,
  title: true,
  amountMinor: true,
  currency: true,
  incurredAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  paidBy: { select: { id: true, displayName: true } },
  shares: {
    orderBy: { id: "asc" },
    select: {
      amountMinor: true,
      user: { select: { id: true, displayName: true } },
    },
  },
} as const;

const requireExpenseTrip = async (userId: string, tripId: string) => {
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, members: { some: { userId } } },
    select: {
      currency: true,
      members: { select: { userId: true } },
    },
  });
  if (!trip) throw new TripNotFoundError();
  return trip;
};

export const splitEqually = (amountMinor: number, participantIds: string[]) => {
  const baseShare = Math.floor(amountMinor / participantIds.length);
  const remainder = amountMinor % participantIds.length;
  return participantIds.map((userId, index) => ({
    userId,
    amountMinor: baseShare + (index < remainder ? 1 : 0),
  }));
};

export const createExpense = async (
  userId: string,
  tripId: string,
  input: CreateExpenseBody,
) => {
  const trip = await requireExpenseTrip(userId, tripId);
  const memberIds = new Set(trip.members.map((member) => member.userId));
  if (
    !memberIds.has(input.paidById) ||
    input.participantIds.some((participantId) => !memberIds.has(participantId))
  ) {
    throw new ExpenseMemberError();
  }

  const shares = splitEqually(input.amountMinor, input.participantIds);
  return prisma.expense.create({
    data: {
      tripId,
      paidById: input.paidById,
      title: input.title,
      amountMinor: input.amountMinor,
      currency: trip.currency,
      incurredAt: new Date(input.incurredAt),
      notes: input.notes ?? null,
      shares: { create: shares },
    },
    select: expenseSelection,
  });
};

export const listExpenses = async (userId: string, tripId: string) => {
  await requireExpenseTrip(userId, tripId);
  return prisma.expense.findMany({
    where: { tripId },
    orderBy: [{ incurredAt: "desc" }, { createdAt: "desc" }],
    select: expenseSelection,
  });
};
