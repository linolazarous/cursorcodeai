/**
 * NextAuth v5 (Auth.js) Configuration for CursorCode AI
 * OAuth-only with first user as super_admin
 */

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

import type { JWT } from "next-auth/jwt";
import type { Session, User } from "next-auth";

import { prisma } from "../db/lib/prisma"; // Update path if needed

export const authOptions: NextAuthConfig = {
  providers: [
    /**
     * GOOGLE
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
     * GITHUB
     */
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],

  callbacks: {
    /**
     * Sign-in callback: create user in DB if not exists
     * First user becomes super_admin automatically
     */
    async signIn({ user }: { user: User }) {
      if (!user.email) return false;

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser) {
        const userCount = await prisma.user.count();

        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name ?? "",
            roles: userCount === 0 ? ["super_admin"] : ["user"], // First user = super_admin
            plan: userCount === 0 ? "ultra" : "starter",
            credits: userCount === 0 ? 5000 : 10,
            totp_enabled: false,
          },
        });
      }

      return true;
    },

    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.email = dbUser.email;
          token.roles = dbUser.roles;
          token.org_id = dbUser.org_id ?? "";
          token.plan = dbUser.plan;
          token.credits = dbUser.credits;
          token.totp_enabled = dbUser.totp_enabled;
        }
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.email = token.email ?? "";
        session.user.roles = token.roles ?? [];
        session.user.org_id = token.org_id ?? "";
        session.user.plan = token.plan ?? "starter";
        session.user.credits = token.credits ?? 0;
        session.user.totp_enabled = token.totp_enabled ?? false;
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
    maxAge: 30 * 24 * 60 * 60,
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
};

const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

export { handlers, auth, signIn, signOut };
