// apps/web/app/api/monitoring/frontend-error/route.ts
import { NextRequest, NextResponse } from "next/server";

interface FrontendErrorPayload {
  message?: string;
  stack?: string;
  source?: string;
  url?: string;
  line?: number;
  col?: number;
  userAgent?: string;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: FrontendErrorPayload = await request.json().catch(() => ({}));

    // Basic validation
    if (!body.message) {
      return NextResponse.json({ error: "Missing error message" }, { status: 400 });
    }

    // Forward to backend monitoring service
    const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/monitoring/frontend-error`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Only forward essential auth context
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        ...body,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        url: request.url,
        userAgent: request.headers.get("user-agent"),
      }),
    });

    if (!backendRes.ok) {
      const errorText = await backendRes.text();
      console.error("[Frontend Error Forwarding Failed]", {
        status: backendRes.status,
        error: errorText,
        originalError: body.message,
      });
      // Still return 200 to client so frontend doesn't get blocked
      return NextResponse.json({ status: "logged_locally" });
    }

    return NextResponse.json({ status: "logged" });
  } catch (err: any) {
    console.error("[Frontend Monitoring Endpoint Error]", {
      message: err.message,
      stack: err.stack,
    });

    return NextResponse.json(
      { error: "Internal monitoring error" },
      { status: 500 }
    );
  }
}
