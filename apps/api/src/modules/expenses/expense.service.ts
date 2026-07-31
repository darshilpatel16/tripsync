import { prisma } from "../../lib/prisma.js";
import { TripNotFoundError } from "../trips/trip.service.js";
import type { CreateExpenseBody } from "./expense.schemas.js";

export class ExpenseMemberError extends Error {
  constructor() {
    super("The payer and every participant must be current trip members");
    this.name = "ExpenseMemberError";
  }
}

export class ExpenseNotFoundError extends Error {}
export class ExpenseEditorRequiredError extends Error {}

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
      members: { select: { userId: true, role: true, user: { select: { displayName: true } } } },
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
  const shares = input.shares ?? splitEqually(input.amountMinor, input.participantIds!);
  const participantIds = shares.map((share) => share.userId);
  if (!memberIds.has(input.paidById) || participantIds.some((participantId) => !memberIds.has(participantId))) throw new ExpenseMemberError();
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

const requireExpenseEditor = async (userId: string, tripId: string, expenseId: string) => {
  const trip = await requireExpenseTrip(userId, tripId);
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, tripId }, select: { paidById: true } });
  if (!expense) throw new ExpenseNotFoundError();
  const membership = trip.members.find((member) => member.userId === userId)!;
  if (membership.role !== "OWNER" && expense.paidById !== userId) throw new ExpenseEditorRequiredError();
  return trip;
};

export const updateExpense = async (userId: string, tripId: string, expenseId: string, input: CreateExpenseBody) => {
  const trip = await requireExpenseEditor(userId, tripId, expenseId);
  const memberIds = new Set(trip.members.map((member) => member.userId));
  const shares = input.shares ?? splitEqually(input.amountMinor, input.participantIds!);
  if (!memberIds.has(input.paidById) || shares.some((share) => !memberIds.has(share.userId))) throw new ExpenseMemberError();
  return prisma.$transaction(async (transaction) => {
    await transaction.expenseShare.deleteMany({ where: { expenseId } });
    return transaction.expense.update({
      where: { id: expenseId },
      data: { title: input.title, amountMinor: input.amountMinor, paidById: input.paidById, incurredAt: new Date(input.incurredAt), notes: input.notes ?? null, shares: { create: shares } },
      select: expenseSelection,
    });
  });
};

export const deleteExpense = async (userId: string, tripId: string, expenseId: string) => {
  await requireExpenseEditor(userId, tripId, expenseId);
  await prisma.expense.delete({ where: { id: expenseId } });
};

export const getExpenseSummary = async (userId: string, tripId: string) => {
  const trip = await requireExpenseTrip(userId, tripId);
  const expenses = await listExpenses(userId, tripId);
  const balances = new Map(trip.members.map((member) => [member.userId, { user: { id: member.userId, displayName: member.user.displayName }, amountMinor: 0 }]));
  for (const expense of expenses) {
    balances.get(expense.paidBy.id)!.amountMinor += expense.amountMinor;
    for (const share of expense.shares) balances.get(share.user.id)!.amountMinor -= share.amountMinor;
  }
  const balanceList = [...balances.values()];
  const creditors = balanceList.filter((item) => item.amountMinor > 0).map((item) => ({ ...item })).sort((a, b) => b.amountMinor - a.amountMinor);
  const debtors = balanceList.filter((item) => item.amountMinor < 0).map((item) => ({ ...item })).sort((a, b) => a.amountMinor - b.amountMinor);
  const settlements: Array<{ from: typeof balanceList[number]["user"]; to: typeof balanceList[number]["user"]; amountMinor: number }> = [];
  let creditorIndex = 0;
  let debtorIndex = 0;
  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]!;
    const debtor = debtors[debtorIndex]!;
    const amountMinor = Math.min(creditor.amountMinor, -debtor.amountMinor);
    settlements.push({ from: debtor.user, to: creditor.user, amountMinor });
    creditor.amountMinor -= amountMinor;
    debtor.amountMinor += amountMinor;
    if (creditor.amountMinor === 0) creditorIndex += 1;
    if (debtor.amountMinor === 0) debtorIndex += 1;
  }
  return { currency: trip.currency, totalMinor: expenses.reduce((sum, expense) => sum + expense.amountMinor, 0), balances: balanceList, settlements };
};
