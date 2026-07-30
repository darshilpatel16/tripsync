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