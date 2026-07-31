import { describe, expect, it } from "vitest";

import { createTripBodySchema, updateTripBodySchema } from "./trip.schemas.js";

describe("createTripBodySchema", () => {
  it("normalises valid trip information", () => {
    expect(
      createTripBodySchema.parse({
        name: "  Summer in Italy  ",
        destination: "  Rome, Italy  ",
        startDate: "2026-09-10",
        endDate: "2026-09-17",
        currency: " eur ",
      }),
    ).toEqual({
      name: "Summer in Italy",
      destination: "Rome, Italy",
      startDate: "2026-09-10",
      endDate: "2026-09-17",
      currency: "EUR",
    });
  });

  it("rejects an impossible calendar date", () => {
    const result = createTripBodySchema.safeParse({
      name: "Invalid date trip",
      destination: "London",
      startDate: "2026-02-30",
      endDate: "2026-03-03",
      currency: "GBP",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    const result = createTripBodySchema.safeParse({
      name: "Backwards trip",
      destination: "London",
      startDate: "2026-09-10",
      endDate: "2026-09-09",
      currency: "GBP",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTripBodySchema", () => {
  it("accepts a partial update", () => {
    expect(updateTripBodySchema.parse({ name: "New trip name" })).toEqual({
      name: "New trip name",
    });
  });

  it("rejects an empty update", () => {
    expect(updateTripBodySchema.safeParse({}).success).toBe(false);
  });
});
