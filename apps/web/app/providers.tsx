// apps/web/app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { ThemeProvider } from "../components/theme-provider";
import { reportFrontendError } from "../lib/monitoring";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  // Global error monitoring (client-side only)
  useEffect(() => {
    if (typeof window === "undefined" || (window as any).__monitoringInitialized) return;

    (window as any).__monitoringInitialized = true;

    const originalOnError = window.onerror;
    window.onerror = (msg, url, line, col, error) => {
      reportFrontendError(error || new Error(String(msg)), {
        source: "window.onerror",
        url,
        line,
        col,
      });
      if (originalOnError) originalOnError(msg, url, line, col, error);
      return false;
    };

    const originalOnUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      reportFrontendError(event.reason, {
        source: "unhandledrejection",
      });
      if (originalOnUnhandledRejection) {
        originalOnUnhandledRejection.call(window, event);
      }
    };
  }, []);

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
