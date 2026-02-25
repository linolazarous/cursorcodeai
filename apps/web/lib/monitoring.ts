// apps/web/lib/monitoring.ts
/**
 * Frontend Error Monitoring for CursorCode AI
 *
 * Sends client-side errors to the backend (/api/monitoring/frontend-error)
 * for logging in Supabase. No third-party services (no Sentry).
 *
 * Features:
 * - Captures window.onerror and unhandled promise rejections
 * - Includes rich context (URL, user agent, stack trace)
 * - Fail-safe (never throws in production)
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

    const res = await fetch("/api/monitoring/frontend-error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      console.warn("[Monitoring] Failed to report to backend:", errorText);
    } else if (process.env.NODE_ENV === "development") {
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

// Extend Window interface for our custom flag
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
    return false; // Let default browser handler also run
  };

  // Catch unhandled promise rejections
  const originalOnUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = (event) => {
    reportFrontendError(event.reason, {
      source: "unhandledrejection",
    });

    // Call original handler with correct 'this' context (fixes TS error)
    if (originalOnUnhandledRejection) {
      originalOnUnhandledRejection.call(window, event);
    }
  };
}
