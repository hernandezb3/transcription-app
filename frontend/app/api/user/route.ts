import { ApiClientError, fastApiClient } from "@/lib/api-client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await fastApiClient.get("/hello");
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
