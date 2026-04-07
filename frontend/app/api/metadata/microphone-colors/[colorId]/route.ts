import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ colorId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { colorId } = await context.params;

  if (!colorId || Number.isNaN(Number(colorId))) {
    return NextResponse.json({ error: "Invalid color id" }, { status: 400 });
  }

  try {
    const data = await fastApiClient.get(`/microphone-colors/${colorId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { colorId } = await context.params;

  if (!colorId || Number.isNaN(Number(colorId))) {
    return NextResponse.json({ error: "Invalid color id" }, { status: 400 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = await fastApiClient.put(`/microphone-colors/${colorId}`, body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { colorId } = await context.params;

  if (!colorId || Number.isNaN(Number(colorId))) {
    return NextResponse.json({ error: "Invalid color id" }, { status: 400 });
  }

  try {
    await fastApiClient.request(`/microphone-colors/${colorId}`, { method: "DELETE" });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      if (error.status === 502 && error.message === "FastAPI returned invalid JSON") {
        return new NextResponse(null, { status: 204 });
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
