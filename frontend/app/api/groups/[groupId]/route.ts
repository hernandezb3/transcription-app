import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ groupId: string }> };

export async function GET(_: Request, context: RouteContext) {
  const { groupId } = await context.params;
  if (!groupId || Number.isNaN(Number(groupId))) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.get(`/groups/${groupId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { groupId } = await context.params;
  if (!groupId || Number.isNaN(Number(groupId))) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.put(`/groups/${groupId}`, body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { groupId } = await context.params;
  if (!groupId || Number.isNaN(Number(groupId))) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.delete(`/groups/${groupId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
