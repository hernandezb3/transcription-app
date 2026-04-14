import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ groupRoleId: string }> };

export async function DELETE(_: Request, context: RouteContext) {
  const { groupRoleId } = await context.params;
  if (!groupRoleId || Number.isNaN(Number(groupRoleId))) {
    return NextResponse.json({ error: "Invalid group-role id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.delete(`/group-roles/${groupRoleId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
