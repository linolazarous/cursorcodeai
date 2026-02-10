// apps/web/app/api/monitoring/error/route.ts
import { NextResponse } from "next/server";

interface ErrorPayload {
  message: string;
  stack?: string;
  component?: string;
  userAgent?: string;
  url?: string;
  [key: string]: any;
}

export async function POST(request: Request) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const body: ErrorPayload = await request.json();

    if (!body.message) {
      return NextResponse.json(
        { status: "invalid", error: "Missing error message" },
        { status: 400 }
      );
    }

    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/monitoring/log-error`;

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      console.error(`Backend logging failed: ${res.status} - ${errorText}`);
      throw new Error(`Backend returned ${res.status}`);
    }

    return NextResponse.json({ status: "logged" });

  } catch (err: any) {
    clearTimeout(timeoutId);

    const isAbort = err.name === "AbortError";
    console.error(
      isAbort ? "Frontend monitoring timeout" : "Frontend monitoring failed:",
      err
    );

    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        status: "error",
        message: isDev ? err.message : "Failed to log error",
      },
      { status: isAbort ? 504 : 500 }
    );
  }
}
