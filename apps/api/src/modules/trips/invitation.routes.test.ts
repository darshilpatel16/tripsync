import "dotenv/config";

import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const app = createApp();
const ownerEmail = "invitation-route-owner@tripsync.test";
const inviteeEmail = "invitation-route-invitee@tripsync.test";
const password = "correct horse battery staple";

const cleanTestData = async () => {
  await prisma.trip.deleteMany({ where: { createdBy: { email: ownerEmail } } });
  await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, inviteeEmail] } } });
};

beforeEach(cleanTestData);
afterEach(cleanTestData);
afterAll(async () => prisma.$disconnect());

const signedInAgent = async (email: string, displayName: string) => {
  const agent = request.agent(app);
  await agent.post("/api/auth/register").send({ displayName, email, password });
  await agent.post("/api/auth/login").send({ email, password });
  return agent;
};

describe("invitation routes", () => {
  it("creates, reads and accepts an invitation", async () => {
    const ownerAgent = await signedInAgent(ownerEmail, "Route Owner");
    const tripResponse = await ownerAgent.post("/api/trips").send({
      name: "Route Invitation Trip",
      destination: "Bristol",
      startDate: "2026-11-01",
      endDate: "2026-11-03",
      currency: "GBP",
    });
    const tripId = tripResponse.body.data.trip.id;

    const createResponse = await ownerAgent
      .post(`/api/trips/${tripId}/invitations`)
      .send({ email: inviteeEmail });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.emailDelivery).toBe("DEVELOPMENT");
    const token = createResponse.body.data.invitationUrl.split("/").at(-1);

    const publicResponse = await request(app).get(`/api/invitations/${token}`);
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.body.data.invitation.trip.name).toBe("Route Invitation Trip");

    const inviteeAgent = await signedInAgent(inviteeEmail, "Route Invitee");
    const acceptResponse = await inviteeAgent.post(`/api/invitations/${token}/accept`);
    expect(acceptResponse.status).toBe(200);
    expect(acceptResponse.body.data).toMatchObject({ tripId, status: "ACCEPTED" });

    const inviteeTrips = await inviteeAgent.get("/api/trips");
    expect(inviteeTrips.body.data.trips).toEqual([
      expect.objectContaining({ id: tripId, role: "MEMBER" }),
    ]);
  });

  it("prevents a member from creating invitations", async () => {
    const response = await request(app)
      .post("/api/trips/11111111-1111-4111-8111-111111111111/invitations")
      .send({ email: inviteeEmail });
    expect(response.status).toBe(401);
  });
});
