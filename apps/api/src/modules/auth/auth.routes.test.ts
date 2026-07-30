import "dotenv/config";

import request from "supertest";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const app = createApp();
const testEmail = "auth-route@tripsync.test";

afterEach(async () => {
  await prisma.user.deleteMany({
    where: {
      email: testEmail,
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/auth/register", () => {
  it("registers a valid user", async () => {
    const response = await request(app).post("/api/auth/register").send({
      displayName: "TripSync Route Test",
      email: testEmail,
      password: "correct horse battery staple",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({
      displayName: "TripSync Route Test",
      email: testEmail,
    });
    expect(response.body.data.user).toHaveProperty("id");
    expect(response.body.data.user).toHaveProperty("createdAt");
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("returns 400 for invalid registration data", async () => {
    const response = await request(app).post("/api/auth/register").send({
      displayName: "D",
      email: "not-an-email",
      password: "short",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "email",
        }),
        expect.objectContaining({
          path: "password",
        }),
      ]),
    );
  });

  it("returns 409 when the email is already registered", async () => {
    const registration = {
      displayName: "TripSync Route Test",
      email: testEmail,
      password: "correct horse battery staple",
    };

    await request(app).post("/api/auth/register").send(registration);

    const response = await request(app)
      .post("/api/auth/register")
      .send(registration);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
  });
});

describe("POST /api/auth/login", () => {
  const registration = {
    displayName: "TripSync Route Test",
    email: testEmail,
    password: "correct horse battery staple",
  };

  it("returns a user for correct credentials", async () => {
    await request(app).post("/api/auth/register").send(registration);

    const response = await request(app).post("/api/auth/login").send({
      email: registration.email,
      password: registration.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      displayName: registration.displayName,
      email: registration.email,
    });
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("returns 401 for an incorrect password", async () => {
    await request(app).post("/api/auth/register").send(registration);

    const response = await request(app).post("/api/auth/login").send({
      email: registration.email,
      password: "this password is incorrect",
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns the same 401 response for an unknown email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "unknown-user@tripsync.test",
      password: "correct horse battery staple",
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});