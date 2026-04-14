import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

/** GET /api/notifications?user_id=&limit=&offset=&unread_only= */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }
  const limit = searchParams.get("limit") ?? "30";
  const offset = searchParams.get("offset") ?? "0";
  const unread_only = searchParams.get("unread_only") ?? "false";

  try {
    const data = await fastApiClient.get(
      `/notifications?user_id=${user_id}&limit=${limit}&offset=${offset}&unread_only=${unread_only}`
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

/** DELETE /api/notifications?user_id= (clear all) */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.delete(`/notifications?user_id=${user_id}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
