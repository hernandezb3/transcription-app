import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ transcriptId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { transcriptId } = await context.params;

  if (!transcriptId || Number.isNaN(Number(transcriptId))) {
    return NextResponse.json(
      { error: "Invalid transcript id" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = await fastApiClient.post(
      `/transcriptions/${transcriptId}/sections`,
      body
    );
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
