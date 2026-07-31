import "dotenv/config";

import request from "supertest";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const app = createApp();
const emails = ["expense-route-owner@tripsync.test", "expense-route-member@tripsync.test"];
const password = "correct horse battery staple";

const clean = async () => {
  await prisma.trip.deleteMany({ where: { createdBy: { email: emails[0] } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
};

afterEach(clean);
afterAll(async () => prisma.$disconnect());

describe("expense routes", () => {
  it("creates and lists an equal-split expense for trip members", async () => {
    const owner = request.agent(app);
    const member = request.agent(app);
    const ownerRegistration = await owner.post("/api/auth/register").send({
      displayName: "Expense Route Owner", email: emails[0], password,
    });
    const memberRegistration = await member.post("/api/auth/register").send({
      displayName: "Expense Route Member", email: emails[1], password,
    });
    await owner.post("/api/auth/login").send({ email: emails[0], password });
    await member.post("/api/auth/login").send({ email: emails[1], password });
    const ownerId = ownerRegistration.body.data.user.id as string;
    const memberId = memberRegistration.body.data.user.id as string;
    const tripResponse = await owner.post("/api/trips").send({
      name: "Expense Route Trip",
      destination: "Rome",
      startDate: "2026-09-10",
      endDate: "2026-09-17",
      currency: "EUR",
    });
    const tripId = tripResponse.body.data.trip.id as string;
    await prisma.tripMember.create({ data: { tripId, userId: memberId } });

    const createResponse = await member.post(`/api/trips/${tripId}/expenses`).send({
      title: "Airport taxi",
      amountMinor: 4501,
      paidById: memberId,
      participantIds: [ownerId, memberId],
      incurredAt: "2026-09-10T10:00:00Z",
    });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.expense).toMatchObject({
      title: "Airport taxi",
      amountMinor: 4501,
      currency: "EUR",
    });

    const listResponse = await owner.get(`/api/trips/${tripId}/expenses`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.expenses).toHaveLength(1);
    expect(listResponse.body.data.expenses[0].shares).toHaveLength(2);
  });

  it("requires authentication", async () => {
    const response = await request(app).get(
      "/api/trips/11111111-1111-4111-8111-111111111111/expenses",
    );
    expect(response.status).toBe(401);
  });
});
