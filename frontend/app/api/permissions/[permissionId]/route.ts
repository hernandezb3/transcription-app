import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ permissionId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const { permissionId } = await context.params;
  if (!permissionId || Number.isNaN(Number(permissionId))) {
    return NextResponse.json({ error: "Invalid permission id" }, { status: 400 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.put(`/permissions/${permissionId}`, body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { permissionId } = await context.params;
  if (!permissionId || Number.isNaN(Number(permissionId))) {
    return NextResponse.json({ error: "Invalid permission id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.delete(`/permissions/${permissionId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
