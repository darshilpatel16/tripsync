import { describe, expect, it } from "vitest";

import {
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
} from "./auth.schemas.js";

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

describe("loginBodySchema", () => {
  it("accepts and normalises valid login data", () => {
    const result = loginBodySchema.parse({
      email: "  DARSHIL@EXAMPLE.COM  ",
      password: "correct horse battery staple",
    });

    expect(result).toEqual({
      email: "darshil@example.com",
      password: "correct horse battery staple",
    });
  });

  it("rejects an empty password", () => {
    const result = loginBodySchema.safeParse({
      email: "darshil@example.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unexpected properties", () => {
    const result = loginBodySchema.safeParse({
      email: "darshil@example.com",
      password: "correct horse battery staple",
      rememberMe: true,
    });

    expect(result.success).toBe(false);
  });
});

describe("password reset schemas", () => {
  it("normalises an email used to request a reset", () => {
    expect(
      forgotPasswordBodySchema.parse({ email: "  USER@EXAMPLE.COM " }),
    ).toEqual({ email: "user@example.com" });
  });

  it("accepts a reset token and a strong new password", () => {
    expect(
      resetPasswordBodySchema.parse({
        token: "example-reset-token",
        password: "a new secure password",
      }),
    ).toEqual({
      token: "example-reset-token",
      password: "a new secure password",
    });
  });

  it("rejects a short replacement password", () => {
    expect(
      resetPasswordBodySchema.safeParse({
        token: "example-reset-token",
        password: "short",
      }).success,
    ).toBe(false);
  });
});
