import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ transcriptId: string }>;
};

/** GET /api/transcripts/:transcriptId/recent-edits */
export async function GET(request: Request, context: RouteContext) {
  const { transcriptId } = await context.params;

  if (!transcriptId || Number.isNaN(Number(transcriptId))) {
    return NextResponse.json({ error: "Invalid transcript id" }, { status: 400 });
  }

  // Forward query params (user_id, limit)
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const path = `/transcripts/${transcriptId}/recent-edits${qs ? `?${qs}` : ""}`;

  try {
    const data = await fastApiClient.get(path);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
