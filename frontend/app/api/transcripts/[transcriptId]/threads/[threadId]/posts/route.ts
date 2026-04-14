import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ transcriptId: string; threadId: string }>;
};

/** GET /api/transcripts/:transcriptId/threads/:threadId/posts */
export async function GET(_: Request, context: RouteContext) {
  const { transcriptId, threadId } = await context.params;
  if (!transcriptId || Number.isNaN(Number(transcriptId)) || !threadId || Number.isNaN(Number(threadId))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.get(`/transcripts/${transcriptId}/threads/${threadId}/posts`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

/** POST /api/transcripts/:transcriptId/threads/:threadId/posts */
export async function POST(req: Request, context: RouteContext) {
  const { transcriptId, threadId } = await context.params;
  if (!transcriptId || Number.isNaN(Number(transcriptId)) || !threadId || Number.isNaN(Number(threadId))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const body = await req.json();
    const data = await fastApiClient.post(`/transcripts/${transcriptId}/threads/${threadId}/posts`, body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
