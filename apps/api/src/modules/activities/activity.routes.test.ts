import "dotenv/config";

import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

const app = createApp();
const ownerEmail = "activity-route-owner@tripsync.test";
const memberEmail = "activity-route-member@tripsync.test";
const outsiderEmail = "activity-route-outsider@tripsync.test";
const password = "correct horse battery staple";

const cleanTestData = async () => {
  await prisma.trip.deleteMany({ where: { createdBy: { email: ownerEmail } } });
  await prisma.user.deleteMany({
    where: { email: { in: [ownerEmail, memberEmail, outsiderEmail] } },
  });
};

const createSignedInAgent = async (email: string, displayName: string) => {
  const agent = request.agent(app);
  const registration = await agent.post("/api/auth/register").send({
    displayName,
    email,
    password,
  });
  await agent.post("/api/auth/login").send({ email, password });
  return { agent, userId: registration.body.data.user.id as string };
};

const createTripWithMember = async () => {
  const owner = await createSignedInAgent(ownerEmail, "Activity Route Owner");
  const member = await createSignedInAgent(memberEmail, "Activity Route Member");
  const tripResponse = await owner.agent.post("/api/trips").send({
    name: "Activity Route Trip",
    destination: "Rome",
    startDate: "2026-09-10",
    endDate: "2026-09-17",
    currency: "EUR",
  });
  const tripId = tripResponse.body.data.trip.id as string;
  await prisma.tripMember.create({
    data: { tripId, userId: member.userId, role: "MEMBER" },
  });
  return { owner, member, tripId };
};

beforeEach(cleanTestData);
afterEach(cleanTestData);
afterAll(async () => prisma.$disconnect());

describe("activity routes", () => {
  it("requires authentication", async () => {
    const response = await request(app).get(
      "/api/trips/11111111-1111-4111-8111-111111111111/activities",
    );
    expect(response.status).toBe(401);
  });

  it("allows members to create, list and edit their activity", async () => {
    const { owner, member, tripId } = await createTripWithMember();
    const createResponse = await member.agent
      .post(`/api/trips/${tripId}/activities`)
      .send({
        title: "Colosseum tour",
        location: "Rome",
        startsAt: "2026-09-12T09:00:00Z",
        endsAt: "2026-09-12T11:00:00Z",
      });
    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.activity).toMatchObject({
      title: "Colosseum tour",
      status: "PROPOSED",
    });
    const activityId = createResponse.body.data.activity.id as string;

    const listResponse = await owner.agent.get(`/api/trips/${tripId}/activities`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.activities).toHaveLength(1);

    const updateResponse = await member.agent
      .patch(`/api/trips/${tripId}/activities/${activityId}`)
      .send({ location: "Colosseo, Rome" });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.activity.location).toBe("Colosseo, Rome");
  });

  it("allows only the owner to confirm activities", async () => {
    const { owner, member, tripId } = await createTripWithMember();
    const createResponse = await member.agent
      .post(`/api/trips/${tripId}/activities`)
      .send({ title: "Dinner in Trastevere" });
    const activityId = createResponse.body.data.activity.id as string;

    const memberResponse = await member.agent
      .patch(`/api/trips/${tripId}/activities/${activityId}/status`)
      .send({ status: "CONFIRMED" });
    expect(memberResponse.status).toBe(403);

    const ownerResponse = await owner.agent
      .patch(`/api/trips/${tripId}/activities/${activityId}/status`)
      .send({ status: "CONFIRMED" });
    expect(ownerResponse.status).toBe(200);
    expect(ownerResponse.body.data.activity.status).toBe("CONFIRMED");
  });

  it("hides a trip's activities from outsiders", async () => {
    const { tripId } = await createTripWithMember();
    const outsider = await createSignedInAgent(outsiderEmail, "Activity Outsider");

    const response = await outsider.agent.get(`/api/trips/${tripId}/activities`);
    expect(response.status).toBe(404);
  });

  it("rejects an invalid activity schedule", async () => {
    const { member, tripId } = await createTripWithMember();
    const response = await member.agent
      .post(`/api/trips/${tripId}/activities`)
      .send({
        title: "Impossible schedule",
        startsAt: "2026-09-12T12:00:00Z",
        endsAt: "2026-09-12T10:00:00Z",
      });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lets members add and remove their activity vote", async () => {
    const { owner, member, tripId } = await createTripWithMember();
    const createResponse = await owner.agent
      .post(`/api/trips/${tripId}/activities`)
      .send({ title: "Evening food tour" });
    const activityId = createResponse.body.data.activity.id as string;

    const voteResponse = await member.agent.post(
      `/api/trips/${tripId}/activities/${activityId}/vote`,
    );
    expect(voteResponse.status).toBe(200);
    expect(voteResponse.body.data.activity.voting).toMatchObject({
      currentUserVoted: true,
      voted: [{ id: member.userId, displayName: "Activity Route Member" }],
    });
    expect(voteResponse.body.data.activity.voting.notVoted).toEqual([
      { id: owner.userId, displayName: "Activity Route Owner" },
    ]);

    const removeResponse = await member.agent.delete(
      `/api/trips/${tripId}/activities/${activityId}/vote`,
    );
    expect(removeResponse.status).toBe(200);
    expect(removeResponse.body.data.activity.voting.currentUserVoted).toBe(false);
    expect(removeResponse.body.data.activity.voting.voted).toEqual([]);
  });

  it("rejects an activity outside the trip dates", async () => {
    const { member, tripId } = await createTripWithMember();
    const response = await member.agent
      .post(`/api/trips/${tripId}/activities`)
      .send({
        title: "After the holiday",
        startsAt: "2026-09-18T10:00:00Z",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "The activity falls outside the trip dates",
    });
  });
});
