import { z } from "zod";

const expenseFields = {
    title: z.string().trim().min(2).max(100),
    amountMinor: z.number().int().positive().max(1_000_000_000),
    paidById: z.string().uuid("Payer ID must be a valid UUID"),
    participantIds: z.array(z.string().uuid()).min(1).max(100).optional(),
    shares: z.array(z.object({
      userId: z.string().uuid(),
      amountMinor: z.number().int().positive(),
    }).strict()).min(1).max(100).optional(),
    incurredAt: z.string().datetime({ offset: true }),
    notes: z.string().trim().min(1).max(1000).nullable().optional(),
};

export const createExpenseBodySchema = z
  .object({
    ...expenseFields,
  })
  .strict()
  .superRefine((value, context) => {
    if (Boolean(value.participantIds) === Boolean(value.shares)) {
      context.addIssue({ code: "custom", path: ["participantIds"], message: "Choose either an equal or custom split" });
    }
    const ids = value.participantIds ?? value.shares?.map((share) => share.userId) ?? [];
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", path: ["participantIds"], message: "Each participant can appear only once" });
    }
    if (value.shares && value.shares.reduce((sum, share) => sum + share.amountMinor, 0) !== value.amountMinor) {
      context.addIssue({ code: "custom", path: ["shares"], message: "Custom shares must add up exactly to the expense total" });
    }
  });

export const expenseTripParamsSchema = z.object({
  tripId: z.string().uuid("Trip ID must be a valid UUID"),
});

export const expenseParamsSchema = z.object({
  tripId: z.string().uuid(),
  expenseId: z.string().uuid(),
});

export type CreateExpenseBody = z.infer<typeof createExpenseBodySchema>;
