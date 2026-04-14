import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ transcriptId: string; todoId: string }>;
};

/** PUT /api/transcripts/:transcriptId/todos/:todoId */
export async function PUT(req: Request, context: RouteContext) {
  const { transcriptId, todoId } = await context.params;
  if (!transcriptId || Number.isNaN(Number(transcriptId)) || !todoId || Number.isNaN(Number(todoId))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const body = await req.json();
    const data = await fastApiClient.put(`/transcripts/${transcriptId}/todos/${todoId}`, body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

/** DELETE /api/transcripts/:transcriptId/todos/:todoId */
export async function DELETE(_: Request, context: RouteContext) {
  const { transcriptId, todoId } = await context.params;
  if (!transcriptId || Number.isNaN(Number(transcriptId)) || !todoId || Number.isNaN(Number(todoId))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.delete(`/transcripts/${transcriptId}/todos/${todoId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
