import { NextResponse } from "next/server";

/**
 * Server-side relay: turns in-app user feedback into a Bloom TASK on the
 * transcription-services voyage board, via Bloom's external intake API
 * (POST /intake/tasks). The task is claimable by the agents building this app.
 *
 * Runs server-side because Bloom's CORS blocks other origins, and to keep the
 * org API key off the client. Intake is AUTHENTICATED — it requires an
 * org-scoped Bloom API key (Bearer), so BLOOM_API_KEY must be set.
 *
 * Flow (Bloom's intake wants a voyage id, so resolve the ship's active voyage):
 *   GET  {BASE}/services/by-tag/{SHIP_TAG}                  -> { id: serviceId }
 *   GET  {BASE}/services/{serviceId}/voyages?status=active  -> { items:[{id}] }
 *   POST {BASE}/intake/tasks  { voyage_id, title, description, category, priority }
 *
 * Config:
 *   BLOOM_API_BASE   default https://bloom-workspace-api.okeanoslabs.com
 *   BLOOM_SHIP_TAG   default transcriptionservices
 *   BLOOM_VOYAGE_ID  pin a voyage id and skip resolution
 *   BLOOM_API_KEY    REQUIRED org key (blm_…) — intake is authenticated
 */

const BLOOM_BASE = (
  process.env.BLOOM_API_BASE ?? "https://bloom-workspace-api.okeanoslabs.com"
).replace(/\/+$/, "");
const SHIP_TAG = process.env.BLOOM_SHIP_TAG ?? "transcriptionservices";
const PINNED_VOYAGE = process.env.BLOOM_VOYAGE_ID;
const API_KEY = process.env.BLOOM_API_KEY;

const CATEGORIES = new Set(["feature", "fix", "chore"]);
const PRIORITIES = new Set(["low", "medium", "high", "critical"]);

function bloomHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["Authorization"] = `Bearer ${API_KEY}`;
  return h;
}

// Cache the resolved voyage id per instance; a rejected POST busts it.
let voyageCache: { id: number; at: number } | null = null;
const VOYAGE_TTL_MS = 5 * 60 * 1000;

async function resolveVoyageId(): Promise<number | null> {
  if (PINNED_VOYAGE) {
    const n = Number(PINNED_VOYAGE);
    return Number.isFinite(n) ? n : null;
  }
  if (voyageCache && Date.now() - voyageCache.at < VOYAGE_TTL_MS) {
    return voyageCache.id;
  }

  const svcRes = await fetch(
    `${BLOOM_BASE}/services/by-tag/${encodeURIComponent(SHIP_TAG)}`,
    { headers: bloomHeaders(), cache: "no-store" },
  );
  if (!svcRes.ok) return null;
  const svc = await svcRes.json().catch(() => null);
  const serviceId = svc?.id;
  if (!serviceId) return null;

  const voyRes = await fetch(
    `${BLOOM_BASE}/services/${serviceId}/voyages?status=active`,
    { headers: bloomHeaders(), cache: "no-store" },
  );
  if (!voyRes.ok) return null;
  const voy = await voyRes.json().catch(() => null);
  const voyageId =
    Array.isArray(voy?.items) && voy.items.length > 0 ? voy.items[0]?.id : null;
  if (!voyageId) return null;

  voyageCache = { id: voyageId, at: Date.now() };
  return voyageId;
}

export async function POST(request: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Bloom API key not configured on the server." },
      { status: 503 },
    );
  }

  let payload: {
    category?: string;
    priority?: string;
    body?: string;
    context?: { path?: string; author?: string };
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = (payload.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Feedback text is required." }, { status: 400 });
  }
  const category = CATEGORIES.has(payload.category ?? "") ? payload.category : "fix";
  const priority = PRIORITIES.has(payload.priority ?? "") ? payload.priority : "medium";

  // First line -> task title; full text + a provenance footer -> description.
  const firstLine = text.split(/\r?\n/)[0].trim();
  const title = firstLine.length > 140 ? `${firstLine.slice(0, 137)}…` : firstLine;
  const path = payload.context?.path?.trim();
  const author = payload.context?.author?.trim();
  const footer = ["via Transcription App", path, author].filter(Boolean).join(" · ");
  const descParts: string[] = [];
  if (text !== title) descParts.push(text);
  descParts.push(footer);
  const description = descParts.join("\n\n");

  let voyageId: number | null;
  try {
    voyageId = await resolveVoyageId();
  } catch {
    return NextResponse.json({ error: "Could not reach Bloom." }, { status: 502 });
  }
  if (!voyageId) {
    return NextResponse.json(
      { error: `No active Bloom voyage for ship "${SHIP_TAG}".` },
      { status: 404 },
    );
  }

  let res: Response;
  try {
    res = await fetch(`${BLOOM_BASE}/intake/tasks`, {
      method: "POST",
      headers: bloomHeaders(),
      body: JSON.stringify({ voyage_id: voyageId, title, description, category, priority }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Bloom." }, { status: 502 });
  }

  if (!res.ok) {
    voyageCache = null; // bust in case the voyage is stale/completed
    return NextResponse.json(
      { error: `Bloom rejected the task (${res.status}).` },
      { status: 502 },
    );
  }

  const created = await res.json().catch(() => null);
  const taskId = created?.data?.id ?? created?.id ?? null;
  return NextResponse.json({ ok: true, taskId });
}
