import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

/**
 * Proxy for the admin Azure OAuth settings (task #3322).
 * The FastAPI backend never returns the client secret — GET yields only whether one
 * is configured, and PUT treats a blank secret as "keep existing".
 */
export async function GET() {
  try {
    const data = await fastApiClient.get("/settings/oauth/azure");
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = await fastApiClient.put("/settings/oauth/azure", body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
