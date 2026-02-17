// packages/db/index.ts
// Barrel file for @cursorcode/db package

// Re-export everything from Prisma Client
export * from '@prisma/client';

// Optional: Export a singleton Prisma client instance (recommended)
export { prisma } from './lib/prisma';

// Re-export useful types for convenience
export type {
  User,
  Project,
  Account,
  Session,
  VerificationToken,
} from '@prisma/client';
