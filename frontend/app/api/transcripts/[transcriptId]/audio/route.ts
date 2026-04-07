import { settings } from "@/lib/settings";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ transcriptId: string }>;
};

/**
 * Proxy GET /api/transcripts/:id/audio → FastAPI backend.
 * Streams the raw audio bytes back to the browser so the <audio> element
 * can consume them directly.
 */
export async function HEAD(_: Request, context: RouteContext) {
  const { transcriptId } = await context.params;

  if (!transcriptId || Number.isNaN(Number(transcriptId))) {
    return new NextResponse(null, { status: 400 });
  }

  const baseUrl = settings.api?.baseUrl;
  if (!baseUrl) {
    return new NextResponse(null, { status: 500 });
  }

  try {
    const backendRes = await fetch(`${baseUrl}/transcripts/${transcriptId}/audio`, {
      method: "HEAD",
      cache: "no-store",
    });
    return new NextResponse(null, { status: backendRes.status });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}

export async function GET(_: Request, context: RouteContext) {
  const { transcriptId } = await context.params;

  if (!transcriptId || Number.isNaN(Number(transcriptId))) {
    return NextResponse.json({ error: "Invalid transcript id" }, { status: 400 });
  }

  const baseUrl = settings.api?.baseUrl;
  if (!baseUrl) {
    return NextResponse.json({ error: "Backend API URL not configured" }, { status: 500 });
  }

  try {
    const backendRes = await fetch(`${baseUrl}/transcripts/${transcriptId}/audio`, {
      cache: "no-store",
    });

    if (!backendRes.ok) {
      return new NextResponse(null, { status: backendRes.status });
    }

    const contentType = backendRes.headers.get("content-type") ?? "audio/mpeg";
    const body = backendRes.body;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to stream audio" }, { status: 502 });
  }
}
