import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ roleId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { roleId } = await context.params;
  if (!roleId || Number.isNaN(Number(roleId))) {
    return NextResponse.json({ error: "Invalid role id" }, { status: 400 });
  }
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ?? "500";
  try {
    const data = await fastApiClient.get(`/role-permissions/by-role/${roleId}?limit=${limit}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
