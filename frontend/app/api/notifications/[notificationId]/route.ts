import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ notificationId: string }> };

/** DELETE /api/notifications/:notificationId */
export async function DELETE(_: Request, context: RouteContext) {
  const { notificationId } = await context.params;
  if (!notificationId || Number.isNaN(Number(notificationId))) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
  }
  try {
    const data = await fastApiClient.delete(`/notifications/${notificationId}`);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
