import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

/** GET /api/users/search?q=&limit= */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const limit = searchParams.get("limit") ?? "10";

  try {
    const data = await fastApiClient.get(`/users/search?q=${encodeURIComponent(q)}&limit=${limit}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
