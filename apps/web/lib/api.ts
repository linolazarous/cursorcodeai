// apps/web/lib/api.ts
import axios, { AxiosInstance, AxiosError } from "axios";
import { signOut } from "next-auth/react";

/**
 * Centralized Axios instance for CursorCode AI Frontend
 * 
 * Features:
 * - Automatically includes credentials (httpOnly cookies)
 * - Global 401 handling → auto sign out + redirect
 * - Request/response interceptors with logging
 * - Timeout protection
 */

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,           // Critical for cookie-based auth with Render backend
  timeout: 15000,                  // 15 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// ────────────────────────────────────────────────
// Request Interceptor
// ────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`🚀 [API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ────────────────────────────────────────────────
// Response Interceptor
// ────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized → Auto sign out
    if (error.response?.status === 401) {
      console.warn("🔑 Session expired or invalid. Signing out...");

      // Prevent infinite loop
      if (!originalRequest?._retry) {
        originalRequest!._retry = true;

        try {
          await signOut({ redirect: true, callbackUrl: "/auth/signin" });
        } catch (signOutError) {
          console.error("Sign out failed:", signOutError);
        }
      }
    }

    // Log errors in development only
    if (process.env.NODE_ENV === "development") {
      console.error(
        `❌ [API Error] ${error.response?.status} ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`,
        error.response?.data || error.message
      );
    }

    return Promise.reject(error);
  }
);

export default api;
