import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.status(200).json({
    status: "ok",
    service: "tripsync-api",
    timestamp: new Date().toISOString(),
  });
});

