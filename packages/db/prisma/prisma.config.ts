// packages/db/prisma/prisma.config.ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"], // optional
});
