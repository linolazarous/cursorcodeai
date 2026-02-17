// packages/db/utils.ts
import bcrypt from 'bcrypt';

/**
 * Password utilities
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Default values
 */
export const DEFAULT_CREDITS = {
  starter: 10,
  standard: 75,
  pro: 150,
  premier: 600,
  ultra: 2000,
} as const;

export const PLAN_LIMITS = {
  starter: { projectsPerMonth: 5, maxBuildTime: 300 },
  pro: { projectsPerMonth: 50, maxBuildTime: 1800 },
  ultra: { projectsPerMonth: 999, maxBuildTime: 7200 },
} as const;

/**
 * Role constants
 */
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

/**
 * Project status constants
 */
export const PROJECT_STATUS = {
  QUEUED: 'queued',
  BUILDING: 'building',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DEPLOYED: 'deployed',
} as const;

export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS];
