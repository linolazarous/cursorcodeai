// apps/web/app/layout.tsx
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider"; // ✅ consistent alias
import { auth } from "@/lib/auth"; // ✅ FIXED: now imports from our centralized lib/auth.ts (after refactor)
import Providers from "./providers"; // ← your client wrapper

// Fonts
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "CursorCode AI",
    template: "%s | CursorCode AI",
  },
  description: "Build Anything. Automatically. With AI.",
  keywords: [
    "AI software engineering",
    "autonomous coding",
    "Grok xAI",
    "CursorCode AI",
    "AI app builder",
  ],
  authors: [{ name: "CursorCode AI Team" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "CursorCode AI",
    description: "Build Anything. Automatically. With AI.",
    images: [{ url: "/og-image.png" }],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth(); // ← now works with our v5 refactor

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} dark`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>

      <body className="font-sans antialiased bg-background text-foreground">
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
