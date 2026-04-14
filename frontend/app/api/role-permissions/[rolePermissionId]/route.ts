import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ rolePermissionId: string }> };

export async function DELETE(_: Request, context: RouteContext) {
  const { rolePermissionId } = await context.params;
  if (!rolePermissionId || Number.isNaN(Number(rolePermissionId))) {
    return NextResponse.json({ error: "Invalid role-permission id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.delete(`/role-permissions/${rolePermissionId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
