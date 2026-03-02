import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  const { userId } = await context.params;

  if (!userId || Number.isNaN(Number(userId))) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    const data = await fastApiClient.delete(`/users/${userId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}