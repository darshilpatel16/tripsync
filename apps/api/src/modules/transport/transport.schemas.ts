import { z } from "zod";

export const transportRouteBodySchema = z.object({
  from: z.string().trim().min(2).max(200),
  to: z.string().trim().min(2).max(200),
  mode: z.enum(["DRIVING", "WALKING", "CYCLING"]),
}).strict();

export type TransportRouteBody = z.infer<typeof transportRouteBodySchema>;
