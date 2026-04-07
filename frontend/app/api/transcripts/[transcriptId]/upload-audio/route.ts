import { settings } from "@/lib/settings";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ transcriptId: string }>;
};

/**
 * Proxy POST /api/transcripts/:id/upload-audio → FastAPI backend.
 * Streams the multipart/form-data body directly to the backend
 * so we don't have to parse/rebuild it in Next.js.
 */
export async function POST(request: Request, context: RouteContext) {
  const { transcriptId } = await context.params;

  if (!transcriptId || Number.isNaN(Number(transcriptId))) {
    return NextResponse.json(
      { error: "Invalid transcript id" },
      { status: 400 }
    );
  }

  const baseUrl = settings.api?.baseUrl;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "Backend API URL not configured" },
      { status: 500 }
    );
  }

  const backendUrl = `${baseUrl}/transcripts/${transcriptId}/upload-audio`;

  try {
    // Buffer the request body and forward it to the backend.
    // Using arrayBuffer() instead of streaming to avoid duplex issues
    // that can cause the backend to receive an empty body.
    const contentType = request.headers.get("content-type") ?? "";
    const bodyBuffer = await request.arrayBuffer();

    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: bodyBuffer,
    });

    if (!backendRes.ok) {
      const text = await backendRes.text();
      return NextResponse.json(
        { error: text || `Backend returned ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload audio file" },
      { status: 502 }
    );
  }
}
