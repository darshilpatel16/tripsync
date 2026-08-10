import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { requireSameOrigin } from "./same-origin.js";

const app = express();
app.use(requireSameOrigin);
app.get("/resource", (_request, response) => response.status(204).send());
app.post("/resource", (_request, response) => response.status(204).send());

describe("requireSameOrigin", () => {
  it("allows safe requests without an Origin header", async () => {
    expect((await request(app).get("/resource")).status).toBe(204);
  });

  it("allows a state change from the configured web origin", async () => {
    const response = await request(app)
      .post("/resource")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(204);
  });

  it("blocks state changes from another origin", async () => {
    const response = await request(app)
      .post("/resource")
      .set("Origin", "https://attacker.example");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("CROSS_ORIGIN_REQUEST_BLOCKED");
  });

  it("blocks cross-site fetch metadata even without Origin", async () => {
    const response = await request(app)
      .post("/resource")
      .set("Sec-Fetch-Site", "cross-site");

    expect(response.status).toBe(403);
  });
});
