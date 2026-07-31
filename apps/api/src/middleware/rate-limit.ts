import type { RequestHandler } from "express";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
};

export const createRateLimiter = ({
  maxRequests,
  windowMs,
}: RateLimitOptions): RequestHandler => {
  const requestsByAddress = new Map<string, RateLimitRecord>();

  return (request, response, next) => {
    const now = Date.now();
    const key = request.ip ?? request.socket.remoteAddress ?? "unknown";
    const existingRecord = requestsByAddress.get(key);
    const record =
      !existingRecord || existingRecord.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : existingRecord;

    record.count += 1;
    requestsByAddress.set(key, record);

    response.setHeader(
      "RateLimit-Remaining",
      Math.max(0, maxRequests - record.count).toString(),
    );

    if (record.count > maxRequests) {
      response.setHeader(
        "Retry-After",
        Math.ceil((record.resetAt - now) / 1000).toString(),
      );
      response.status(429).json({
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts. Please wait and try again.",
        },
      });
      return;
    }

    next();
  };
};
