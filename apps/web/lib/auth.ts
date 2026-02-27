/**
 * NextAuth v5 (Auth.js) Configuration for CursorCode AI
 * Extracted to lib/auth.ts for clean separation
 */

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

import type { JWT } from "next-auth/jwt";
import type { Session, User } from "next-auth";

/**
 * AUTH OPTIONS - properly typed for Auth.js v5
 */
export const authOptions: NextAuthConfig = {
  providers: [
    /**
     * EMAIL / PASSWORD
     */
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp_code: { label: "2FA Code", type: "text" },
      },

      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
          const res = await fetch(`${apiUrl}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              totp_code: credentials.totp_code || undefined,
            }),
          });

          if (!res.ok) {
            console.error("Login failed:", await res.text());
            return null;
          }

          const user = await res.json();

          return {
            id: user.id ?? "",
            email: user.email ?? "",
            name: user.email ?? "",
            roles: user.roles ?? ["user"],
            org_id: user.org_id ?? "",
            plan: user.plan ?? "starter",
            credits: user.credits ?? 0,
            totp_enabled: !!user.totp_enabled,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),

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

/**
 * Initialize Auth.js (this is the modern v5 way)
 */
const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

export { handlers, auth, signIn, signOut };
