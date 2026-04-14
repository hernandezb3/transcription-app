import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ groupId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { groupId } = await context.params;
  if (!groupId || Number.isNaN(Number(groupId))) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ?? "100";
  try {
    const data = await fastApiClient.get(`/group-roles/by-group/${groupId}?limit=${limit}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
