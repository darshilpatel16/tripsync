import { z } from "zod";

const optionalText = (maximum: number) =>
  z.string().trim().min(1).max(maximum).nullable().optional();

const dateTime = z
  .string()
  .datetime({ offset: true, message: "Use a valid date and time with a timezone" });

const activityFields = {
  title: z
    .string()
    .trim()
    .min(2, "Activity title must contain at least 2 characters")
    .max(100, "Activity title must contain at most 100 characters"),
  description: optionalText(1000),
  location: optionalText(200),
  startsAt: dateTime.nullable().optional(),
  endsAt: dateTime.nullable().optional(),
};

const scheduleIsValid = (value: { startsAt?: string | null; endsAt?: string | null }) =>
  !value.endsAt || Boolean(value.startsAt && value.endsAt >= value.startsAt);

export const createActivityBodySchema = z
  .object(activityFields)
  .strict()
  .refine(scheduleIsValid, {
    path: ["endsAt"],
    message: "End time requires a start time and cannot be before it",
  });

export const updateActivityBodySchema = z
  .object({
    title: activityFields.title.optional(),
    description: activityFields.description,
    location: activityFields.location,
    startsAt: activityFields.startsAt,
    endsAt: activityFields.endsAt,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one activity field to update",
  })
  .refine(scheduleIsValid, {
    path: ["endsAt"],
    message: "End time requires a start time and cannot be before it",
  });

export const activityStatusBodySchema = z
  .object({
    status: z.enum(["PROPOSED", "CONFIRMED", "CANCELLED"]),
  })
  .strict();

export const activityParamsSchema = z.object({
  tripId: z.string().uuid("Trip ID must be a valid UUID"),
  activityId: z.string().uuid("Activity ID must be a valid UUID"),
});

export const activityTripParamsSchema = z.object({
  tripId: z.string().uuid("Trip ID must be a valid UUID"),
});

export type CreateActivityBody = z.infer<typeof createActivityBodySchema>;
export type UpdateActivityBody = z.infer<typeof updateActivityBodySchema>;
export type ActivityStatusBody = z.infer<typeof activityStatusBodySchema>;
