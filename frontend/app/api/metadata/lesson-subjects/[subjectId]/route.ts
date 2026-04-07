import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ subjectId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { subjectId } = await context.params;

  if (!subjectId || Number.isNaN(Number(subjectId))) {
    return NextResponse.json({ error: "Invalid subject id" }, { status: 400 });
  }

  try {
    const data = await fastApiClient.get(`/lesson-subjects/${subjectId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { subjectId } = await context.params;

  if (!subjectId || Number.isNaN(Number(subjectId))) {
    return NextResponse.json({ error: "Invalid subject id" }, { status: 400 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const data = await fastApiClient.put(`/lesson-subjects/${subjectId}`, body);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { subjectId } = await context.params;

  if (!subjectId || Number.isNaN(Number(subjectId))) {
    return NextResponse.json({ error: "Invalid subject id" }, { status: 400 });
  }

  try {
    await fastApiClient.request(`/lesson-subjects/${subjectId}`, { method: "DELETE" });
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
