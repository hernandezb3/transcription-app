import { NextResponse } from "next/server";

/**
 * Server-side relay: turns a user's in-app feedback into a task on the team's
 * Bloom board (POST /intake/tasks). The user never sees any of this — to them
 * it's just "send feedback about this page." We attach rich, invisible context
 * (page, time, navigation trail, device) so the team can triage with insight.
 *
 * Runs server-side (Bloom CORS blocks other origins) and keeps the org API key
 * off the client. Intake is authenticated, so BLOOM_API_KEY must be set.
 *
 * Config:
 *   BLOOM_API_BASE       default https://bloom-workspace-api.okeanoslabs.com
 *   BLOOM_SHIP_TAG       default transcriptionservices
 *   BLOOM_VOYAGE_ID      pin a voyage id and skip resolution
 *   BLOOM_API_KEY        REQUIRED org key (blm_…)
 *   BLOOM_TASK_CATEGORY  default 'feature'  (feature|fix|chore) — user never picks
 *   BLOOM_TASK_PRIORITY  default 'medium'   (low|medium|high|critical)
 */

const BLOOM_BASE = (
  process.env.BLOOM_API_BASE ?? "https://bloom-workspace-api.okeanoslabs.com"
).replace(/\/+$/, "");
const SHIP_TAG = process.env.BLOOM_SHIP_TAG ?? "transcriptionservices";
const PINNED_VOYAGE = process.env.BLOOM_VOYAGE_ID;
const API_KEY = process.env.BLOOM_API_KEY;

const CATEGORIES = new Set(["feature", "fix", "chore"]);
const PRIORITIES = new Set(["low", "medium", "high", "critical"]);
const DEFAULT_CATEGORY =
  process.env.BLOOM_TASK_CATEGORY && CATEGORIES.has(process.env.BLOOM_TASK_CATEGORY)
    ? process.env.BLOOM_TASK_CATEGORY
    : "feature";
const DEFAULT_PRIORITY =
  process.env.BLOOM_TASK_PRIORITY && PRIORITIES.has(process.env.BLOOM_TASK_PRIORITY)
    ? process.env.BLOOM_TASK_PRIORITY
    : "medium";

type FeedbackContext = {
  path?: string;
  url?: string;
  pageTitle?: string;
  referrer?: string | null;
  navTrail?: string[];
  localTime?: string;
  timezone?: string;
  isoTime?: string;
  userAgent?: string;
  language?: string;
  viewport?: string;
  screen?: string;
  author?: string | null;
  email?: string | null;
};

function bloomHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) h["Authorization"] = `Bearer ${API_KEY}`;
  return h;
}

/** Best-effort "Chrome 120 on macOS" from a user-agent string. */
function describeUA(ua?: string): string {
  if (!ua) return "";
  let os = "";
  if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";
  let br = "";
  let m: RegExpMatchArray | null;
  if ((m = ua.match(/Edg\/(\d+)/))) br = `Edge ${m[1]}`;
  else if ((m = ua.match(/OPR\/(\d+)/))) br = `Opera ${m[1]}`;
  else if ((m = ua.match(/Chrome\/(\d+)/))) br = `Chrome ${m[1]}`;
  else if ((m = ua.match(/Firefox\/(\d+)/))) br = `Firefox ${m[1]}`;
  else if ((m = ua.match(/Version\/(\d+)[^S]*Safari/))) br = `Safari ${m[1]}`;
  return [br, os].filter(Boolean).join(" on ");
}

/** Render the captured context into a readable block for the task body. */
function formatContext(ctx: FeedbackContext): string {
  const lines: string[] = [];
  const page = [ctx.pageTitle, ctx.path ? `(${ctx.path})` : null].filter(Boolean).join(" ");
  if (page) lines.push(`Page: ${page}`);
  if (ctx.url) lines.push(`URL: ${ctx.url}`);
  if (ctx.localTime) {
    lines.push(`When: ${ctx.localTime}${ctx.timezone ? ` (${ctx.timezone})` : ""}`);
  }
  if (Array.isArray(ctx.navTrail) && ctx.navTrail.length > 1) {
    lines.push(`Journey: ${ctx.navTrail.join(" → ")}`);
  }
  if (ctx.referrer) lines.push(`Came from: ${ctx.referrer}`);
  const who = [ctx.author, ctx.email].filter(Boolean).join(" · ");
  if (who) lines.push(`User: ${who}`);
  const device = [
    describeUA(ctx.userAgent),
    ctx.viewport ? `${ctx.viewport} viewport` : "",
    ctx.language,
  ]
    .filter(Boolean)
    .join(" · ");
  if (device) lines.push(`Device: ${device}`);
  return lines.join("\n");
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

  let payload: { body?: string; context?: FeedbackContext };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = (payload.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "Feedback text is required." }, { status: 400 });
  }

  // First line -> task title; full text + captured context -> description.
  const firstLine = text.split(/\r?\n/)[0].trim();
  const title = firstLine.length > 140 ? `${firstLine.slice(0, 137)}…` : firstLine;
  const ctxBlock = payload.context ? formatContext(payload.context) : "";
  const description = [text, ctxBlock ? `—— Context ——\n${ctxBlock}` : ""]
    .filter(Boolean)
    .join("\n\n");

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
      body: JSON.stringify({
        voyage_id: voyageId,
        title,
        description,
        category: DEFAULT_CATEGORY,
        priority: DEFAULT_PRIORITY,
      }),
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
