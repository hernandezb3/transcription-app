import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ participantId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { participantId } = await context.params;

  if (!participantId || Number.isNaN(Number(participantId))) {
    return NextResponse.json({ error: "Invalid participant id" }, { status: 400 });
  }

  try {
    const data = await fastApiClient.get(`/participants/${participantId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { participantId } = await context.params;

  if (!participantId || Number.isNaN(Number(participantId))) {
    return NextResponse.json({ error: "Invalid participant id" }, { status: 400 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = await fastApiClient.put(`/participants/${participantId}`, body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { participantId } = await context.params;

  if (!participantId || Number.isNaN(Number(participantId))) {
    return NextResponse.json({ error: "Invalid participant id" }, { status: 400 });
  }

  try {
    await fastApiClient.request(`/participants/${participantId}`, { method: "DELETE" });
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
