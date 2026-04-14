import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ sectionId: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  const { sectionId } = await context.params;

  if (!sectionId || Number.isNaN(Number(sectionId))) {
    return NextResponse.json(
      { error: "Invalid section id" },
      { status: 400 }
    );
  }

  try {
    const data = await fastApiClient.delete(
      `/transcriptions/sections/${sectionId}`
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
