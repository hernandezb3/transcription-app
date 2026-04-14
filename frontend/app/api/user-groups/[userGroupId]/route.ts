import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ userGroupId: string }> };

export async function DELETE(_: Request, context: RouteContext) {
  const { userGroupId } = await context.params;
  if (!userGroupId || Number.isNaN(Number(userGroupId))) {
    return NextResponse.json({ error: "Invalid user-group id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.delete(`/user-groups/${userGroupId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
