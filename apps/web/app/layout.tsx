// apps/web/app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { auth } from "@/app/api/auth/[...nextauth]/route"

// ────────────────────────────────────────────────
// Custom monitoring – global error reporting
// ────────────────────────────────────────────────
import { reportFrontendError } from "@/lib/monitoring"

if (typeof window !== "undefined") {
  // Global sync error handler
  window.onerror = (msg, url, line, col, error) => {
    reportFrontendError(error || new Error(String(msg)), {
      source: "window.onerror",
      url,
      line,
      col,
    })
    return false // Let default handler log to console too
  }

  // Global async/unhandled promise rejection handler
  window.addEventListener("unhandledrejection", (event) => {
    reportFrontendError(event.reason, {
      source: "unhandledrejection",
      promise: event.promise,
    })
  })
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "CursorCode AI",
    template: "%s | CursorCode AI",
  },
  description: "Build Anything. Automatically. With AI.",
  keywords: ["AI", "code generation", "autonomous software", "Grok", "xAI"],
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
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload critical assets */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Security headers (enhanced via next.config.mjs or Vercel) */}
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="format-detection" content="telephone=no" />
      </head>

      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider session={session}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}

              {/* Global Toaster (sonner) */}
              <Toaster position="top-right" richColors closeButton />
            </ThemeProvider>
          </QueryClientProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
