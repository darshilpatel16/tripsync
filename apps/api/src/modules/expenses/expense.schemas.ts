import { z } from "zod";

export const createExpenseBodySchema = z
  .object({
    title: z.string().trim().min(2).max(100),
    amountMinor: z.number().int().positive().max(1_000_000_000),
    paidById: z.string().uuid("Payer ID must be a valid UUID"),
    participantIds: z
      .array(z.string().uuid("Participant ID must be a valid UUID"))
      .min(1, "Choose at least one participant")
      .max(100),
    incurredAt: z
      .string()
      .datetime({ offset: true, message: "Use a valid date and time with a timezone" }),
    notes: z.string().trim().min(1).max(1000).nullable().optional(),
  })
  .strict()
  .refine((value) => new Set(value.participantIds).size === value.participantIds.length, {
    path: ["participantIds"],
    message: "Each participant can appear only once",
  });

export const expenseTripParamsSchema = z.object({
  tripId: z.string().uuid("Trip ID must be a valid UUID"),
});

export type CreateExpenseBody = z.infer<typeof createExpenseBodySchema>;
