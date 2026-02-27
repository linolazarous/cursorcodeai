/**
 * NextAuth v5 (Auth.js) Configuration for CursorCode AI
 * OAuth Only: Google & GitHub
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
      if (user) {
        token.id = user.id ?? "";
        token.email = user.email ?? "";
        token.roles = user.roles ?? [];
        token.org_id = user.org_id ?? "";
        token.plan = user.plan ?? "starter";
        token.credits = user.credits ?? 0;
        token.totp_enabled = !!user.totp_enabled;
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
    signIn: "/auth/signin", // optional custom page
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
