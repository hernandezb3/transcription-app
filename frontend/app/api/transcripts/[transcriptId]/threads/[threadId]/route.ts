import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ transcriptId: string; threadId: string }>;
};

/** GET /api/transcripts/:transcriptId/threads/:threadId */
export async function GET(_: Request, context: RouteContext) {
  const { transcriptId, threadId } = await context.params;
  if (!transcriptId || Number.isNaN(Number(transcriptId)) || !threadId || Number.isNaN(Number(threadId))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.get(`/transcripts/${transcriptId}/threads/${threadId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

/** PUT /api/transcripts/:transcriptId/threads/:threadId */
export async function PUT(req: Request, context: RouteContext) {
  const { transcriptId, threadId } = await context.params;
  if (!transcriptId || Number.isNaN(Number(transcriptId)) || !threadId || Number.isNaN(Number(threadId))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const body = await req.json();
    const data = await fastApiClient.put(`/transcripts/${transcriptId}/threads/${threadId}`, body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

/** DELETE /api/transcripts/:transcriptId/threads/:threadId */
export async function DELETE(_: Request, context: RouteContext) {
  const { transcriptId, threadId } = await context.params;
  if (!transcriptId || Number.isNaN(Number(transcriptId)) || !threadId || Number.isNaN(Number(threadId))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.delete(`/transcripts/${transcriptId}/threads/${threadId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
