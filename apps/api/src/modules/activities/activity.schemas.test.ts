import { describe, expect, it } from "vitest";

import {
  activityStatusBodySchema,
  createActivityBodySchema,
  updateActivityBodySchema,
} from "./activity.schemas.js";

describe("activity schemas", () => {
  it("normalises a valid activity", () => {
    expect(
      createActivityBodySchema.parse({
        title: "  Colosseum tour  ",
        description: "  Guided visit  ",
        location: "  Rome  ",
        startsAt: "2026-09-12T10:00:00+01:00",
        endsAt: "2026-09-12T12:00:00+01:00",
      }),
    ).toEqual({
      title: "Colosseum tour",
      description: "Guided visit",
      location: "Rome",
      startsAt: "2026-09-12T10:00:00+01:00",
      endsAt: "2026-09-12T12:00:00+01:00",
    });
  });

  it("rejects an end time without a start time", () => {
    expect(
      createActivityBodySchema.safeParse({
        title: "Late dinner",
        endsAt: "2026-09-12T22:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("rejects an end time before the start time", () => {
    expect(
      createActivityBodySchema.safeParse({
        title: "Backwards activity",
        startsAt: "2026-09-12T12:00:00Z",
        endsAt: "2026-09-12T10:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("accepts a partial update but rejects an empty one", () => {
    expect(updateActivityBodySchema.parse({ location: "Vatican City" })).toEqual({
      location: "Vatican City",
    });
    expect(updateActivityBodySchema.safeParse({}).success).toBe(false);
  });

  it("accepts only supported activity statuses", () => {
    expect(activityStatusBodySchema.parse({ status: "CONFIRMED" })).toEqual({
      status: "CONFIRMED",
    });
    expect(activityStatusBodySchema.safeParse({ status: "FINISHED" }).success).toBe(false);
  });
});
