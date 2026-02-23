// packages/db/prisma/prisma.config.ts
import { PrismaClient } from "@prisma/client";

// PrismaClient automatically reads DATABASE_URL from environment
export const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"], // optional for debugging
});
