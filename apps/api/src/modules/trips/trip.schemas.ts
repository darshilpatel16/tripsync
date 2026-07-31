import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date format YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a real calendar date");

const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Currency must be a three-letter code such as GBP");

const tripFields = {
  name: z
    .string()
    .trim()
    .min(2, "Trip name must contain at least 2 characters")
    .max(80, "Trip name must contain at most 80 characters"),
  destination: z
    .string()
    .trim()
    .min(2, "Destination must contain at least 2 characters")
    .max(120, "Destination must contain at most 120 characters"),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  currency: currencySchema,
};

const datesAreInOrder = (value: { startDate?: string; endDate?: string }) =>
  !value.startDate || !value.endDate || value.endDate >= value.startDate;

export const createTripBodySchema = z
  .object(tripFields)
  .strict()
  .refine(datesAreInOrder, {
    path: ["endDate"],
    message: "End date cannot be before start date",
  });

export const updateTripBodySchema = z
  .object({
    name: tripFields.name.optional(),
    destination: tripFields.destination.optional(),
    startDate: tripFields.startDate.optional(),
    endDate: tripFields.endDate.optional(),
    currency: tripFields.currency.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one trip field to update",
  })
  .refine(datesAreInOrder, {
    path: ["endDate"],
    message: "End date cannot be before start date",
  });

export const tripIdParamsSchema = z.object({
  tripId: z.string().uuid("Trip ID must be a valid UUID"),
});

export type CreateTripBody = z.infer<typeof createTripBodySchema>;
export type UpdateTripBody = z.infer<typeof updateTripBodySchema>;
