// packages/types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;

      // Custom fields from your User model
      roles: string[];
      plan: string;
      credits: number;
      org_id?: string;
      totp_enabled?: boolean;
    };
  }

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
