import { NextResponse } from "next/server";

/**
 * Server-side relay: forwards in-app feedback to the Bloom worklog so the
 * agents building this app can see it.
 *
 * This MUST run server-side: Bloom's CORS only allows its own origins, so a
 * browser POST would be blocked — and this keeps any Bloom API key off the
 * client.
 *
 * Bloom's feedback endpoint must attach to a voyage, but a ship may not have an
 * active voyage yet. So this relay is hybrid:
 *   - If the ship has an active voyage -> POST voyage-scoped agent-feedback
 *     (GET /services/by-tag/{tag} -> id; GET /services/{id}/voyages?status=active).
 *   - Otherwise -> POST a message into the ship's Crew Quarters team room,
 *     which only needs the ship_tag. It still reaches the crew building the ship,
 *     and the relay auto-upgrades to real feedback once a voyage exists.
 *
 * Config (all optional — defaults work out of the box):
 *   BLOOM_API_BASE   default https://bloom-workspace-api.okeanoslabs.com
 *   BLOOM_SHIP_TAG   default transcriptionservices  (this app's ship in Bloom)
 *   BLOOM_VOYAGE_ID  pin a voyage id and skip voyage resolution entirely
 *   BLOOM_API_KEY    optional blm_ org key -> sent as Bearer. Bloom is
 *                    network-trust today, but this is forward-compatible.
 */

const BLOOM_BASE = (
  process.env.BLOOM_API_BASE ?? "https://bloom-workspace-api.okeanoslabs.com"
).replace(/\/+$/, "");
const SHIP_TAG = process.env.BLOOM_SHIP_TAG ?? "transcriptionservices";
const PINNED_VOYAGE = process.env.BLOOM_VOYAGE_ID;
const API_KEY = process.env.BLOOM_API_KEY;

const VERDICTS = new Set(["comment", "needs_changes", "looks_good"]);

function bloomHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["Authorization"] = `Bearer ${API_KEY}`;
  return h;
}

// Cache the resolved voyage id per instance for a few minutes; a rejected
// POST busts it in case the voyage has since completed.
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

  // 1) ship_tag (repo slug) -> service id
  const svcRes = await fetch(
    `${BLOOM_BASE}/services/by-tag/${encodeURIComponent(SHIP_TAG)}`,
    { headers: bloomHeaders(), cache: "no-store" },
  );
  if (!svcRes.ok) return null;
  const svc = await svcRes.json().catch(() => null);
  const serviceId = svc?.id;
  if (!serviceId) return null;

  // 2) service -> active voyage id
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
  let payload: {
    verdict?: string;
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
  const verdict = VERDICTS.has(payload.verdict ?? "") ? payload.verdict : "comment";

  // Append a small provenance footer so the crew know where it came from.
  const path = payload.context?.path?.trim();
  const author = payload.context?.author?.trim();
  const footer = ["via Transcription App", path, author].filter(Boolean).join(" · ");
  const composedBody = `${text}\n\n— ${footer}`;

  let voyageId: number | null;
  try {
    voyageId = await resolveVoyageId();
  } catch {
    return NextResponse.json({ error: "Could not reach Bloom." }, { status: 502 });
  }

  // Primary path: real voyage-scoped feedback. Fallback: Crew Quarters room.
  let res: Response;
  let channel: "feedback" | "room";
  try {
    if (voyageId) {
      channel = "feedback";
      res = await fetch(`${BLOOM_BASE}/voyages/${voyageId}/agent-feedback`, {
        method: "POST",
        headers: bloomHeaders(),
        body: JSON.stringify({
          verdict,
          body: composedBody,
          author_agent_slug: "transcription-app",
          author_agent_name: "Transcription App",
        }),
        cache: "no-store",
      });
    } else {
      channel = "room";
      res = await fetch(`${BLOOM_BASE}/agent-room-messages`, {
        method: "POST",
        headers: bloomHeaders(),
        body: JSON.stringify({
          ship_tag: SHIP_TAG,
          body: composedBody,
          author_name: author || "Transcription App",
        }),
        cache: "no-store",
      });
    }
  } catch {
    return NextResponse.json({ error: "Could not reach Bloom." }, { status: 502 });
  }

  if (!res.ok) {
    voyageCache = null; // bust in case the voyage is stale/completed
    return NextResponse.json(
      { error: `Bloom rejected the message (${res.status}).` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, channel });
}
