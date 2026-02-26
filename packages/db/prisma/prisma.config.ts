import { PrismaClient } from "@prisma/client";

// Prevent multiple instances in development (Next.js HMR)
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["query", "info", "warn", "error"], // optional
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
