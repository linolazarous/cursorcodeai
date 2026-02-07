// apps/web/app/api/monitoring/frontend-error/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Forward to backend monitoring endpoint
    const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/monitoring/frontend-error`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward cookies (for auth context like user_id)
        Cookie: request.headers.get("cookie") || "",
        "X-Forwarded-For": request.headers.get("x-forwarded-for") || "",
      },
      body: JSON.stringify(body),
    })

    if (!backendRes.ok) {
      const errorText = await backendRes.text()
      console.error("Backend monitoring failed:", errorText)
      return NextResponse.json({ error: "Failed to log error" }, { status: 500 })
    }

    return NextResponse.json({ status: "logged" })
  } catch (err) {
    console.error("Frontend monitoring endpoint error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
