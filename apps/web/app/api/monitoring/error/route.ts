// apps/web/app/api/monitoring/error/route.ts
import { NextRequest, NextResponse } from "next/server";

interface ErrorPayload {
  message: string;
  stack?: string;
  component?: string;
  userAgent?: string;
  url?: string;
  timestamp?: string;
  source?: string;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    let body: ErrorPayload;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (!body.message) {
      return NextResponse.json(
        { success: false, error: "Missing error message" },
        { status: 400 }
      );
    }

    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/monitoring/log-error`;

    // Fallback if env is missing (prevents 500 on Vercel)
    if (!process.env.NEXT_PUBLIC_API_URL) {
      console.warn("[Monitoring] NEXT_PUBLIC_API_URL not set — logging locally only");
      return NextResponse.json({ success: true, status: "logged_locally" });
    }

    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        ...body,
        timestamp: body.timestamp || new Date().toISOString(),
        environment: process.env.NODE_ENV || "production",
        frontendUrl: body.url || request.url,
        userAgent: body.userAgent || request.headers.get("user-agent"),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!backendRes.ok) {
      const errorText = await backendRes.text().catch(() => "Unknown backend error");
      console.error(`[Monitoring] Backend failed ${backendRes.status}: ${errorText}`);
      // Still return success so frontend never breaks
      return NextResponse.json({ success: true, status: "logged_locally" });
    }

    return NextResponse.json({ success: true, status: "logged" });
  } catch (err: any) {
    clearTimeout(timeoutId);

    const isAbort = err.name === "AbortError";

    console.error(
      isAbort ? "[Monitoring] Backend timeout (10s)" : "[Monitoring] Proxy failed",
      err
    );

    return NextResponse.json(
      {
        success: false,
        status: "error",
        message: process.env.NODE_ENV === "development" ? err.message : "Failed to log error",
      },
      { status: isAbort ? 504 : 500 }
    );
  }
}
