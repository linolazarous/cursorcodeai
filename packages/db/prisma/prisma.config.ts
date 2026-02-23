// packages/db/prisma/prisma.config.ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  // Use the DATABASE_URL from your environment variables
  adapter: process.env.DATABASE_URL,
});

// Optional: Enable logging in development
if (process.env.NODE_ENV !== "production") {
  prisma.$on("query", (e) => {
    console.log("Query: " + e.query);
    console.log("Params: " + e.params);
    console.log("Duration: " + e.duration + "ms");
  });
}
