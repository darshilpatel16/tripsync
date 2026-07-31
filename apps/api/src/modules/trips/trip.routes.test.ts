import "dotenv/config";

import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const app = createApp();
const email = "trip-route@tripsync.test";
const password = "correct horse battery staple";

const cleanTestData = async () => {
  await prisma.trip.deleteMany({ where: { createdBy: { email } } });
  await prisma.user.deleteMany({ where: { email } });
};

const createSignedInAgent = async () => {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({
    displayName: "Trip Route User",
    email,
    password,
  });
  await agent.post("/api/auth/login").send({ email, password });
  return agent;
};

beforeEach(cleanTestData);
afterEach(cleanTestData);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("trip routes", () => {
  it("requires authentication", async () => {
    const response = await request(app).get("/api/trips");
    expect(response.status).toBe(401);
  });

  it("creates, lists and retrieves a trip", async () => {
    const agent = await createSignedInAgent();
    const createResponse = await agent.post("/api/trips").send({
      name: "Summer in Italy",
      destination: "Rome, Italy",
      startDate: "2026-09-10",
      endDate: "2026-09-17",
      currency: "EUR",
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.trip).toMatchObject({
      role: "OWNER",
      memberCount: 1,
    });

    const tripId = createResponse.body.data.trip.id;
    const listResponse = await agent.get("/api/trips");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.trips).toHaveLength(1);

    const detailResponse = await agent.get(`/api/trips/${tripId}`);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.trip.members).toHaveLength(1);
  });

  it("rejects invalid trip dates", async () => {
    const agent = await createSignedInAgent();
    const response = await agent.post("/api/trips").send({
      name: "Invalid trip",
      destination: "London",
      startDate: "2026-09-10",
      endDate: "2026-09-09",
      currency: "GBP",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("updates a trip owned by the signed-in user", async () => {
    const agent = await createSignedInAgent();
    const createResponse = await agent.post("/api/trips").send({
      name: "Original trip",
      destination: "London",
      startDate: "2026-10-10",
      endDate: "2026-10-12",
      currency: "GBP",
    });
    const tripId = createResponse.body.data.trip.id;

    const updateResponse = await agent.patch(`/api/trips/${tripId}`).send({
      name: "Updated city break",
      destination: "Bath",
      startDate: "2026-10-11",
      endDate: "2026-10-14",
      currency: "EUR",
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.trip).toMatchObject({
      id: tripId,
      name: "Updated city break",
      destination: "Bath",
      currency: "EUR",
      role: "OWNER",
    });
  });
});
