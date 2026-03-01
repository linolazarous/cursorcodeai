/**
 * NextAuth v5 (Auth.js) Configuration for CursorCode AI
 * 
 * HYBRID AUTH SETUP:
 * - OAuth (Google & GitHub) → Fully handled by NextAuth
 * - Email/Password + 2FA + Reset → Handled by your FastAPI backend (sets httpOnly cookies)
 * - Dashboard/Admin pages use `await auth()` for consistent session across all login methods
 */

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

import type { JWT } from "next-auth/jwt";
import type { Session, User } from "next-auth";

export const authOptions: NextAuthConfig = {
  providers: [
    /**
     * GOOGLE OAUTH
     */
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    /**
     * GITHUB OAUTH
     */
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],

  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      // OAuth providers populate the user object on first sign-in
      if (user) {
        token.id = user.id ?? "";
        token.email = user.email ?? "";
        token.roles = (user as any).roles ?? [];
        token.org_id = (user as any).org_id ?? "";
        token.plan = (user as any).plan ?? "starter";
        token.credits = (user as any).credits ?? 0;
        token.totp_enabled = !!(user as any).totp_enabled;
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.roles = token.roles as string[];
        session.user.org_id = token.org_id as string;
        session.user.plan = token.plan as string;
        session.user.credits = token.credits as number;
        session.user.totp_enabled = token.totp_enabled as boolean;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  cookies: {
    sessionToken: {
      name: "__Secure-authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
};

const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

export { handlers, auth, signIn, signOut };
