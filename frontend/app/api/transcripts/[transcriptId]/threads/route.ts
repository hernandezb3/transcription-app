import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ transcriptId: string }>;
};

/** GET  /api/transcripts/:transcriptId/threads?search=... */
export async function GET(req: Request, context: RouteContext) {
  const { transcriptId } = await context.params;
  if (!transcriptId || Number.isNaN(Number(transcriptId))) {
    return NextResponse.json({ error: "Invalid transcript id" }, { status: 400 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    const data = await fastApiClient.get(`/transcripts/${transcriptId}/threads${qs}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

/** POST /api/transcripts/:transcriptId/threads */
export async function POST(req: Request, context: RouteContext) {
  const { transcriptId } = await context.params;
  if (!transcriptId || Number.isNaN(Number(transcriptId))) {
    return NextResponse.json({ error: "Invalid transcript id" }, { status: 400 });
  }
  try {
    const body = await req.json();
    const data = await fastApiClient.post(`/transcripts/${transcriptId}/threads`, body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
