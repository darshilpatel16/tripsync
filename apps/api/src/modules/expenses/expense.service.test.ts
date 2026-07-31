import "dotenv/config";

import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "../../lib/prisma.js";
import { registerUser } from "../auth/auth.service.js";
import { createTrip, TripNotFoundError } from "../trips/trip.service.js";
import {
  createExpense,
  deleteExpense,
  ExpenseMemberError,
  listExpenses,
  getExpenseSummary,
  splitEqually,
  updateExpense,
} from "./expense.service.js";

const emails = [
  "expense-owner@tripsync.test",
  "expense-member@tripsync.test",
  "expense-outsider@tripsync.test",
];
let ownerId: string;
let memberId: string;
let outsiderId: string;
let tripId: string;

const clean = async () => {
  await prisma.trip.deleteMany({ where: { createdBy: { email: emails[0] } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
};

beforeEach(async () => {
  await clean();
  const [owner, member, outsider] = await Promise.all(
    emails.map((email, index) => registerUser({
      displayName: ["Expense Owner", "Expense Member", "Expense Outsider"][index]!,
      email,
      password: "correct horse battery staple",
    })),
  );
  ownerId = owner!.id;
  memberId = member!.id;
  outsiderId = outsider!.id;
  const trip = await createTrip(ownerId, {
    name: "Expense Test Trip",
    destination: "Rome",
    startDate: "2026-09-10",
    endDate: "2026-09-17",
    currency: "EUR",
  });
  tripId = trip.id;
  await prisma.tripMember.create({
    data: { tripId, userId: memberId, role: "MEMBER" },
  });
});

afterEach(clean);
afterAll(async () => prisma.$disconnect());

describe("expense service", () => {
  it("splits indivisible minor units without losing money", () => {
    expect(splitEqually(100, ["a", "b", "c"])).toEqual([
      { userId: "a", amountMinor: 34 },
      { userId: "b", amountMinor: 33 },
      { userId: "c", amountMinor: 33 },
    ]);
  });

  it("creates and lists an equal-split expense using the trip currency", async () => {
    const expense = await createExpense(ownerId, tripId, {
      title: "Shared dinner",
      amountMinor: 10001,
      paidById: ownerId,
      participantIds: [ownerId, memberId],
      incurredAt: "2026-09-12T19:00:00Z",
    });
    expect(expense.currency).toBe("EUR");
    expect(expense.shares.map((share) => share.amountMinor).reduce((a, b) => a + b, 0)).toBe(10001);
    await expect(listExpenses(memberId, tripId)).resolves.toEqual([
      expect.objectContaining({ id: expense.id, title: "Shared dinner" }),
    ]);
  });

  it("rejects non-members and expense participants outside the trip", async () => {
    await expect(listExpenses(outsiderId, tripId)).rejects.toBeInstanceOf(
      TripNotFoundError,
    );
    await expect(createExpense(ownerId, tripId, {
      title: "Invalid split",
      amountMinor: 5000,
      paidById: ownerId,
      participantIds: [ownerId, outsiderId],
      incurredAt: "2026-09-12T19:00:00Z",
    })).rejects.toBeInstanceOf(ExpenseMemberError);
  });

  it("supports custom updates, balances, settlements and deletion", async () => {
    const expense = await createExpense(ownerId, tripId, {
      title: "Custom dinner", amountMinor: 10000, paidById: ownerId,
      shares: [{ userId: ownerId, amountMinor: 4000 }, { userId: memberId, amountMinor: 6000 }],
      incurredAt: "2026-09-12T19:00:00Z",
    });
    const summary = await getExpenseSummary(memberId, tripId);
    expect(summary.totalMinor).toBe(10000);
    expect(summary.settlements).toEqual([{ from: { id: memberId, displayName: "Expense Member" }, to: { id: ownerId, displayName: "Expense Owner" }, amountMinor: 6000 }]);
    const updated = await updateExpense(ownerId, tripId, expense.id, {
      title: "Updated dinner", amountMinor: 9000, paidById: ownerId,
      participantIds: [ownerId, memberId], incurredAt: "2026-09-12T19:00:00Z",
    });
    expect(updated.shares.reduce((sum, share) => sum + share.amountMinor, 0)).toBe(9000);
    await deleteExpense(ownerId, tripId, expense.id);
    await expect(listExpenses(ownerId, tripId)).resolves.toEqual([]);
  });
});
