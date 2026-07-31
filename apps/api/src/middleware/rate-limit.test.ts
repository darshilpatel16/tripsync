import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limit.js";

describe("createRateLimiter", () => {
  it("blocks requests above the configured limit", async () => {
    const app = express();
    app.get(
      "/limited",
      createRateLimiter({ maxRequests: 2, windowMs: 60_000 }),
      (_request, response) => response.status(204).send(),
    );

    expect((await request(app).get("/limited")).status).toBe(204);
    expect((await request(app).get("/limited")).status).toBe(204);

    const blockedResponse = await request(app).get("/limited");

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body.error.code).toBe("TOO_MANY_REQUESTS");
    expect(blockedResponse.headers).toHaveProperty("retry-after");
  });
});
