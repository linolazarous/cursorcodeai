// apps/web/app/api/monitoring/error/route.ts
import { NextRequest, NextResponse } from "next/server";

interface ErrorPayload {
  message: string;
  stack?: string;
  component?: string;
  userAgent?: string;
  url?: string;
  timestamp?: string;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const body: ErrorPayload = await request.json().catch(() => ({}));

    if (!body.message) {
      return NextResponse.json(
        { status: "invalid", error: "Missing error message" },
        { status: 400 }
      );
    }

    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/monitoring/log-error`;

    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward auth cookies for user context on backend
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        ...body,
        timestamp: body.timestamp || new Date().toISOString(),
        environment: process.env.NODE_ENV,
        url: body.url || request.url,
        userAgent: body.userAgent || request.headers.get("user-agent"),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!backendRes.ok) {
      const errorText = await backendRes.text().catch(() => "Unknown error");
      console.error(`[Backend Error Logging Failed] ${backendRes.status} - ${errorText}`);

      // Still return success to client so frontend doesn't break
      return NextResponse.json({ status: "logged_locally" });
    }

    return NextResponse.json({ status: "logged" });
  } catch (err: any) {
    clearTimeout(timeoutId);

    const isAbort = err.name === "AbortError";

    console.error(
      isAbort
        ? "[Frontend Error Monitoring Timeout]"
        : "[Frontend Error Monitoring Failed]",
      err
    );

    return NextResponse.json(
      {
        status: "error",
        message: process.env.NODE_ENV === "development" ? err.message : "Failed to log error",
      },
      { status: isAbort ? 504 : 500 }
    );
  }
}
