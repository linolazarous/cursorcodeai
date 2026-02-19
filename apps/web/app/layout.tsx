// apps/web/app/layout.tsx
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { auth } from "@/app/api/auth/[...nextauth]/route";

// ────────────────────────────────────────────────
// Custom monitoring – global error reporting
// ────────────────────────────────────────────────
import { reportFrontendError } from "@/lib/monitoring";

if (typeof window !== "undefined") {
  // Global sync error handler
  window.onerror = (msg, url, line, col, error) => {
    reportFrontendError(error || new Error(String(msg)), {
      source: "window.onerror",
      url,
      line,
      col,
    });
    return false;
  };

  // Global async/unhandled promise rejection handler
  window.addEventListener("unhandledrejection", (event) => {
    reportFrontendError(event.reason, {
      source: "unhandledrejection",
      promise: event.promise,
    });
  });
}

// ────────────────────────────────────────────────
// Fonts — matched to logo + video storyboard
// ────────────────────────────────────────────────
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
    "no code AI",
    "full-stack AI",
  ],
  authors: [{ name: "CursorCode AI Team" }],
  creator: "CursorCode AI",
  publisher: "CursorCode AI",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://cursorcode.ai",
    siteName: "CursorCode AI",
    title: "CursorCode AI - Build Anything. Automatically. With AI.",
    description: "The world's most powerful autonomous AI software engineering platform powered by xAI’s Grok.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CursorCode AI - Build Anything. Automatically. With AI.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CursorCode AI",
    description: "Build Anything. Automatically. With AI.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} dark`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="format-detection" content="telephone=no" />
      </head>

      <body className="font-sans antialiased bg-background text-foreground">
        <SessionProvider session={session}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"           // ← Forced dark to match logo/video
              enableSystem={false}          // Optional: remove system toggle if you want pure dark
              disableTransitionOnChange
            >
              {children}

              {/* Global Toaster */}
              <Toaster position="top-right" richColors closeButton />
            </ThemeProvider>
          </QueryClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
