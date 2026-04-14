import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ transcriptId: string; speakerId: string }>;
};

/** PUT /api/transcriptions/:transcriptId/speakers/:speakerId */
export async function PUT(request: Request, context: RouteContext) {
  const { transcriptId, speakerId } = await context.params;

  if (!transcriptId || Number.isNaN(Number(transcriptId))) {
    return NextResponse.json({ error: "Invalid transcript id" }, { status: 400 });
  }
  if (!speakerId || Number.isNaN(Number(speakerId))) {
    return NextResponse.json({ error: "Invalid speaker id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = await fastApiClient.put(
      `/transcriptions/${transcriptId}/speakers/${speakerId}`,
      body
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
