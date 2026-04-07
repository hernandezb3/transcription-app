import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ transcriptId: string; fileId: string }>;
};

/** DELETE /api/transcripts/:id/files/:fileId → soft-delete a transcript file */
export async function DELETE(_: Request, context: RouteContext) {
  const { transcriptId, fileId } = await context.params;

  if (!transcriptId || Number.isNaN(Number(transcriptId))) {
    return NextResponse.json({ error: "Invalid transcript id" }, { status: 400 });
  }
  if (!fileId || Number.isNaN(Number(fileId))) {
    return NextResponse.json({ error: "Invalid file id" }, { status: 400 });
  }

  try {
    await fastApiClient.request(`/transcripts/${transcriptId}/files/${fileId}`, {
      method: "DELETE",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      // Backend returns 204 with no body — FastApiClient throws on empty JSON
      if (error.status === 502 && error.message === "FastAPI returned invalid JSON") {
        return new NextResponse(null, { status: 204 });
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
