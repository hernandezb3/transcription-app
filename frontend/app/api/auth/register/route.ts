import { apiBaseUrl } from "@/lib/settings";
import { NextResponse } from "next/server";

/**
 * Proxy POST /api/auth/register → FastAPI backend /auth/register.
 * See app/api/auth/login/route.ts for why auth is proxied server-side.
 * The backend response (status + JSON body) is forwarded verbatim.
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
    backendRes = await fetch(`${apiBaseUrl}/auth/register`, {
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
