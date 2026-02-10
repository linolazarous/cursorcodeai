// apps/web/app/api/auth/[...nextauth]/route.ts
/**
 * NextAuth v5 / Auth.js Configuration - CursorCode AI Frontend
 * Full production-ready auth (February 2025 standards):
 * - Credentials (email/password) with backend JWT
 * - OAuth (Google, GitHub)
 * - Secure httpOnly cookies
 * - Role/org context in session
 * - Custom sign-in page
 */

import NextAuth, { NextAuthOptions, User } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"

import { JWT } from "next-auth/jwt"

export const authOptions: NextAuthOptions = {
  // ────────────────────────────────────────────────
  // Providers
  // ────────────────────────────────────────────────
  providers: [
    // 1. Email/Password (Credentials) - calls backend /auth/login
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp_code: { label: "2FA Code (if enabled)", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              totp_code: credentials.totp_code || undefined,
            }),
            credentials: "include", // Important: sends/receives cookies
          })

          if (!res.ok) {
            const error = await res.json()
            throw new Error(error.detail || "Invalid credentials")
          }

          const user = await res.json()

          // Return user object (will be saved in JWT)
          return {
            id: user.id,
            email: user.email,
            name: user.email.split("@")[0],
            roles: user.roles || ["user"],
            org_id: user.org_id,
            plan: user.plan || "starter",
            credits: user.credits || 0,
            accessToken: req.cookies?.access_token, // Optional: if needed
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      },
    }),

    // 2. Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // 3. GitHub OAuth
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],

  // ────────────────────────────────────────────────
  // Callbacks
  // ────────────────────────────────────────────────
  callbacks: {
    // 1. JWT callback - runs on sign-in and every token refresh
    async jwt({ token, user, account, profile, trigger }) {
      // Initial sign-in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.roles = user.roles || ["user"]
        token.org_id = user.org_id
        token.plan = user.plan || "starter"
        token.credits = user.credits || 0
      }

      // Refresh token rotation (if backend issues new tokens)
      if (trigger === "update" && user?.accessToken) {
        token.accessToken = user.accessToken
      }

      return token
    },

    // 2. Session callback - exposes data to client via useSession()
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.roles = token.roles as string[]
        session.user.org_id = token.org_id as string
        session.user.plan = token.plan as string
        session.user.credits = token.credits as number
      }

      return session
    },
  },

  // ────────────────────────────────────────────────
  // Pages (custom routes)
  // ────────────────────────────────────────────────
  pages: {
    signIn: "/auth/signin",       // Custom login page
    error: "/auth/error",         // Error page
    verifyRequest: "/auth/verify-request", // Email verification request
    newUser: "/auth/onboarding",  // After first OAuth signup
  },

  // ────────────────────────────────────────────────
  // Session & JWT
  // ────────────────────────────────────────────────
  session: {
    strategy: "jwt",              // JWT instead of DB sessions
    maxAge: 30 * 24 * 60 * 60,    // 30 days
  },

  jwt: {
    maxAge: 15 * 60,              // Access token 15 min
  },

  // ────────────────────────────────────────────────
  // Cookies (secure in prod)
  // ────────────────────────────────────────────────
  cookies: {
    sessionToken: {
      name: `__Secure-authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `__Secure-authjs.callback-url`,
      options: { sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
    csrfToken: {
      name: `__Host-authjs.csrf-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
    pkceCodeVerifier: {
      name: "__Secure-authjs.pkce.code_verifier",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },

  // ────────────────────────────────────────────────
  // Secret (required for encryption)
  // ────────────────────────────────────────────────
  secret: process.env.NEXTAUTH_SECRET,
}

// ────────────────────────────────────────────────
export const { handlers, signIn, signOut, auth } = NextAuth(authOptions)
export { GET, POST } from "next-auth/next"
