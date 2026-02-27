import { PrismaClient } from '@prisma/client';

/**
 * Ensure a single instance of PrismaClient
 * across hot-reloads in development.
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.prisma ?? new PrismaClient({ log: ['query', 'error'] });

// Assign to globalThis in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
