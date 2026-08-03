import { z } from "zod";

const optionalEnvironmentValue = (minimumLength: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().min(minimumLength).optional(),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(5000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  RESEND_API_KEY: optionalEnvironmentValue(1),
  EMAIL_FROM: optionalEnvironmentValue(3),
});

export const env = envSchema.parse(process.env);
