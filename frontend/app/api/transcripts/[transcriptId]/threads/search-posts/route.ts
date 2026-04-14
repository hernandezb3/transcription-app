import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ transcriptId: string }>;
};

/** GET /api/transcripts/:transcriptId/threads/search-posts?q=... */
export async function GET(req: Request, context: RouteContext) {
  const { transcriptId } = await context.params;
  if (!transcriptId || Number.isNaN(Number(transcriptId))) {
    return NextResponse.json({ error: "Invalid transcript id" }, { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json([]);
  }
  try {
    const data = await fastApiClient.get(
      `/transcripts/${transcriptId}/threads/search-posts?q=${encodeURIComponent(q)}`,
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
