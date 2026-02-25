// packages/types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Extended User type (matches your Prisma/DB model)
   */
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;

    // Custom fields
    roles: string[];
    plan: string;
    credits: number;
    org_id?: string;
    totp_enabled?: boolean;
  }

  /**
   * Extended Session – reuses the User above + default session fields
   */
  interface Session {
    user: User & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    roles: string[];
    plan: string;
    credits: number;
    org_id?: string;
    totp_enabled?: boolean;
  }
}
