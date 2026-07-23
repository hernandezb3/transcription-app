import { apiBaseUrl } from "@/lib/settings";
import { NextResponse } from "next/server";

/**
 * Proxy POST /api/auth/login → FastAPI backend /auth/login.
 *
 * Login/register are the only browser-originated backend calls, so they go
 * through this server-side proxy like every other API call. That keeps the
 * FastAPI service internal to the cluster (no public ingress on the backend).
 * The backend response (status + JSON body, including the `detail` error
 * message) is forwarded verbatim so the sign-in form can surface it.
 */
export async function POST(request: Request) {
  if (!apiBaseUrl) {
    return NextResponse.json(
      { detail: "Backend API URL not configured." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request body." }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: "Could not reach the authentication service." },
      { status: 502 }
    );
  }

  const text = await backendRes.text();
  return new NextResponse(text, {
    status: backendRes.status,
    headers: {
      "Content-Type": backendRes.headers.get("content-type") ?? "application/json",
    },
  });
}
