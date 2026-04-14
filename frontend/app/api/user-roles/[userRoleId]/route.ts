import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ userRoleId: string }> };

export async function DELETE(_: Request, context: RouteContext) {
  const { userRoleId } = await context.params;
  if (!userRoleId || Number.isNaN(Number(userRoleId))) {
    return NextResponse.json({ error: "Invalid user-role id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.delete(`/user-roles/${userRoleId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
