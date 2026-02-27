// apps/web/lib/monitoring.ts
/**
 * Frontend Error Monitoring for CursorCode AI
 *
 * Sends client-side errors to /api/monitoring/frontend-error for logging.
 * Uses the centralized api.ts for consistency with auth & all other calls.
 */

import api from "./api";

/**
 * Report a frontend error to the backend
 */
export async function reportFrontendError(
  error: Error | string,
  extra: Record<string, any> = {}
) {
  try {
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    const payload = {
      message,
      stack,
      url: typeof window !== "undefined" ? window.location.href : "server",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      timestamp: new Date().toISOString(),
      ...extra,
    };

    await api.post("/api/monitoring/frontend-error", payload);

    if (process.env.NODE_ENV === "development") {
      console.log("[Monitoring] Error reported successfully:", message);
    }
  } catch (reportErr) {
    // Fail silently in production to avoid cascading errors
    if (process.env.NODE_ENV === "development") {
      console.error("[Monitoring] Reporting failed:", reportErr);
    }
  }
}

// ────────────────────────────────────────────────
// Global Error Handlers (Client-Side Only)
// ────────────────────────────────────────────────
declare global {
  interface Window {
    __monitoringInitialized?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__monitoringInitialized) {
  window.__monitoringInitialized = true;

  // Catch synchronous errors
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

  // Catch unhandled promise rejections
  const originalOnUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = (event) => {
    reportFrontendError(event.reason, {
      source: "unhandledrejection",
    });

    if (originalOnUnhandledRejection) {
      originalOnUnhandledRejection.call(window, event);
    }
  };
}
