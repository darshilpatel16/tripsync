import { describe, expect, it } from "vitest";

import { registerBodySchema } from "./auth.schemas.js";

describe("registerBodySchema", () => {
  it("accepts and normalises valid registration data", () => {
    const result = registerBodySchema.parse({
      displayName: "  Darshil Patel  ",
      email: "  DARSHIL@EXAMPLE.COM  ",
      password: "correct horse battery staple",
    });

    expect(result).toEqual({
      displayName: "Darshil Patel",
      email: "darshil@example.com",
      password: "correct horse battery staple",
    });
  });

  it("rejects an invalid email address", () => {
    const result = registerBodySchema.safeParse({
      displayName: "Darshil Patel",
      email: "not-an-email",
      password: "correct horse battery staple",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 12 characters", () => {
    const result = registerBodySchema.safeParse({
      displayName: "Darshil Patel",
      email: "darshil@example.com",
      password: "short",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unexpected properties", () => {
    const result = registerBodySchema.safeParse({
      displayName: "Darshil Patel",
      email: "darshil@example.com",
      password: "correct horse battery staple",
      isAdmin: true,
    });

    expect(result.success).toBe(false);
  });
});