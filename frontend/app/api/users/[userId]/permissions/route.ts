import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { userId } = await context.params;

  try {
    const data = await fastApiClient.get(`/users/${userId}/permissions`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
