import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

/** PUT /api/notifications/read-all?user_id= */
export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get("user_id");
  if (!user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.put(`/notifications/read-all?user_id=${user_id}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
