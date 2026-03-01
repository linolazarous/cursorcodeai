// apps/web/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { auth } from "../lib/auth";   // ← NextAuth server-side session (OAuth + Credentials hybrid)
import Providers from "./providers"; // ← Your client wrapper (SessionProvider, etc.)

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
    "AI app builder",
    "CursorCode AI",
    "self-directing AI engineering",
  ],
  authors: [{ name: "CursorCode AI Team" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "CursorCode AI",
    description: "Build Anything. Automatically. With AI.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    siteName: "CursorCode AI",
    url: "https://cursorcode.ai",
  },
  twitter: {
    card: "summary_large_image",
    title: "CursorCode AI",
    description: "Build Anything. Automatically. With AI.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth(); // ← Keeps NextAuth hybrid working (OAuth + your custom Credentials provider)

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} dark`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>

      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        {/* Explicit ThemeProvider + Providers wrapper (best practice) */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="cursorcode-theme"
        >
          <Providers session={session}>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
