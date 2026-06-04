import { settings } from "@/lib/settings";
import { getAuthToken } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ transcriptId: string }>;
};

/**
 * Proxy POST /api/transcripts/:id/upload-audio → FastAPI backend.
 * Forwards the multipart/form-data body (audio_file + transcript_file)
 * directly to the backend.
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

    const headers: Record<string, string> = { "Content-Type": contentType };
    const token = await getAuthToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers,
      body: bodyBuffer,
    });

    if (!backendRes.ok) {
      // FastAPI errors arrive as { detail: ... }. Our typed upload errors put a
      // structured object there ({ message, code, file }); older paths put a
      // plain string. Normalise both into { error, code, file } for the UI.
      const raw = await backendRes.text();
      let error = raw || `Backend returned ${backendRes.status}`;
      let code: string | undefined;
      let file: string | undefined;
      try {
        const body = JSON.parse(raw);
        const detail = body?.detail ?? body?.error ?? body;
        if (detail && typeof detail === "object") {
          error = detail.message ?? error;
          code = detail.code;
          file = detail.file;
        } else if (typeof detail === "string") {
          error = detail;
        }
      } catch {
        /* non-JSON body — keep the raw text */
      }
      return NextResponse.json({ error, code, file }, { status: backendRes.status });
    }

    const data = await backendRes.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 502 }
    );
  }
}
