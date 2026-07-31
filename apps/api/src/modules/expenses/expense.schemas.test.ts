import { describe, expect, it } from "vitest";

import { createExpenseBodySchema } from "./expense.schemas.js";

const validExpense = {
  title: "Dinner in Rome",
  amountMinor: 10100,
  paidById: "11111111-1111-4111-8111-111111111111",
  participantIds: [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
  ],
  incurredAt: "2026-09-12T19:00:00Z",
};

describe("createExpenseBodySchema", () => {
  it("accepts valid expense information", () => {
    expect(createExpenseBodySchema.parse(validExpense)).toMatchObject(validExpense);
  });

  it("rejects a non-positive or fractional minor-unit amount", () => {
    expect(createExpenseBodySchema.safeParse({ ...validExpense, amountMinor: 0 }).success).toBe(false);
    expect(createExpenseBodySchema.safeParse({ ...validExpense, amountMinor: 10.5 }).success).toBe(false);
  });

  it("rejects duplicate participants", () => {
    expect(createExpenseBodySchema.safeParse({
      ...validExpense,
      participantIds: [validExpense.participantIds[0], validExpense.participantIds[0]],
    }).success).toBe(false);
  });

  it("accepts exact custom shares and rejects an incorrect total", () => {
    const custom = { ...validExpense, participantIds: undefined, shares: [
      { userId: validExpense.participantIds[0], amountMinor: 6000 },
      { userId: validExpense.participantIds[1], amountMinor: 4100 },
    ] };
    expect(createExpenseBodySchema.safeParse(custom).success).toBe(true);
    expect(createExpenseBodySchema.safeParse({ ...custom, shares: [{ ...custom.shares[0], amountMinor: 5000 }, custom.shares[1] ] }).success).toBe(false);
  });
});
