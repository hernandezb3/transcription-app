import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ roleId: string }> };

export async function GET(_: Request, context: RouteContext) {
  const { roleId } = await context.params;
  if (!roleId || Number.isNaN(Number(roleId))) {
    return NextResponse.json({ error: "Invalid role id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.get(`/roles/${roleId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { roleId } = await context.params;
  if (!roleId || Number.isNaN(Number(roleId))) {
    return NextResponse.json({ error: "Invalid role id" }, { status: 400 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.put(`/roles/${roleId}`, body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { roleId } = await context.params;
  if (!roleId || Number.isNaN(Number(roleId))) {
    return NextResponse.json({ error: "Invalid role id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.delete(`/roles/${roleId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
