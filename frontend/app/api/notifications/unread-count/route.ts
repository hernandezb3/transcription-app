import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

/** GET /api/notifications/unread-count?user_id= */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.get(`/notifications/unread-count?user_id=${user_id}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
