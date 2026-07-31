import "dotenv/config";

import request from "supertest";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { createPasswordResetToken } from "./auth.service.js";

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

    const sessionCookies = response.headers["set-cookie"];

    expect(sessionCookies).toBeDefined();
    expect(sessionCookies?.[0]).toContain("tripsync_session=");
    expect(sessionCookies?.[0]).toContain("HttpOnly");
    expect(sessionCookies?.[0]).toContain("SameSite=Lax");
    expect(sessionCookies?.[0]).toContain("Path=/");

    await expect(
      prisma.session.count({
        where: {
          userId: response.body.data.user.id,
        },
      }),
    ).resolves.toBe(1);
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
describe("authenticated session routes", () => {
  const registration = {
    displayName: "TripSync Session Route Test",
    email: testEmail,
    password: "correct horse battery staple",
  };

  it("returns the signed-in user and rejects access after logout", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send(registration);

    const loginResponse = await agent.post("/api/auth/login").send({
      email: registration.email,
      password: registration.password,
    });

    expect(loginResponse.status).toBe(200);

    const currentUserResponse = await agent.get("/api/auth/me");

    expect(currentUserResponse.status).toBe(200);
    expect(currentUserResponse.body.data.user).toMatchObject({
      displayName: registration.displayName,
      email: registration.email,
    });

    const logoutResponse = await agent.post("/api/auth/logout");

    expect(logoutResponse.status).toBe(204);

    await expect(
      prisma.session.count({
        where: {
          userId: loginResponse.body.data.user.id,
        },
      }),
    ).resolves.toBe(0);

    const afterLogoutResponse = await agent.get("/api/auth/me");

    expect(afterLogoutResponse.status).toBe(401);
    expect(afterLogoutResponse.body.error.code).toBe(
      "AUTHENTICATION_REQUIRED",
    );
  });

  it("returns 401 when no session cookie is provided", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(
      "AUTHENTICATION_REQUIRED",
    );
  });
});

describe("password reset routes", () => {
  const registration = {
    displayName: "TripSync Reset Route Test",
    email: testEmail,
    password: "correct horse battery staple",
  };

  it("returns the same accepted response for known and unknown emails", async () => {
    await request(app).post("/api/auth/register").send(registration);

    const knownEmailResponse = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: registration.email });
    const unknownEmailResponse = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "unknown-user@tripsync.test" });

    expect(knownEmailResponse.status).toBe(202);
    expect(unknownEmailResponse.status).toBe(202);
    expect(knownEmailResponse.body.data.message).toBe(
      unknownEmailResponse.body.data.message,
    );
  });

  it("resets the password with a valid one-time token", async () => {
    await request(app).post("/api/auth/register").send(registration);
    const reset = await createPasswordResetToken(registration.email);

    const resetResponse = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: reset!.token,
        password: "the replacement secure password",
      });

    expect(resetResponse.status).toBe(204);

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: registration.email,
      password: "the replacement secure password",
    });

    expect(loginResponse.status).toBe(200);
  });

  it("rejects an invalid reset token", async () => {
    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: "invalid-reset-token",
        password: "the replacement secure password",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_RESET_TOKEN");
  });
});
