import { PrismaClient } from "@prisma/client";

const logLevels: Array<"warn" | "error"> =
  process.env.NODE_ENV === "test" ? [] : ["warn", "error"];

export const prisma = new PrismaClient({
  log: logLevels,
});