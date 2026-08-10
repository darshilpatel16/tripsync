import type { RequestHandler } from "express";

import { env } from "../config/env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Blocks browser-initiated state changes from another website. SameSite=Lax
 * cookies already reduce CSRF risk; validating Origin and Fetch Metadata adds
 * an independent server-side boundary for modern browsers.
 */
export const requireSameOrigin: RequestHandler = (request, response, next) => {
  if (SAFE_METHODS.has(request.method)) {
    next();
    return;
  }

  const origin = request.get("origin");
  const fetchSite = request.get("sec-fetch-site");
  // Use the configured public origin instead of reconstructing it from Host,
  // which is supplied by the client and can be rewritten by a proxy.
  const expectedOrigin = new URL(env.WEB_ORIGIN).origin;

  if (fetchSite === "cross-site" || (origin && origin !== expectedOrigin)) {
    response.status(403).json({
      error: {
        code: "CROSS_ORIGIN_REQUEST_BLOCKED",
        message: "This request must come from the TripSync website",
      },
    });
    return;
  }

  // Production browser requests that mutate state are expected to carry an
  // Origin header. Test and local API clients may omit it intentionally.
  if (env.NODE_ENV === "production" && !origin) {
    response.status(403).json({
      error: {
        code: "ORIGIN_REQUIRED",
        message: "A trusted request origin is required",
      },
    });
    return;
  }

  next();
};
