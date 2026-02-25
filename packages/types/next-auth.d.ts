// packages/types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

/**
 * Extended User type (matches your Prisma/DB model)
 */
declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;

    // Custom fields (all optional for real-world session safety)
    roles?: string[];
    plan?: string;
    credits?: number;
    org_id?: string;
    totp_enabled?: boolean;
  }

  /**
   * Extended Session – reuses the User above + default session fields
   */
  interface Session {
    user: User & DefaultSession["user"];
    accessToken?: string;   // ← Added for dashboard API calls
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;

    // Custom fields (all optional)
    roles?: string[];
    plan?: string;
    credits?: number;
    org_id?: string;
    totp_enabled?: boolean;
    accessToken?: string;   // ← Added so JWT callbacks can include it
  }
}
