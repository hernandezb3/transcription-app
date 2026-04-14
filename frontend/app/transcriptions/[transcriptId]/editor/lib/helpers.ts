/** Convert "00:01:23" or "83" (seconds) into seconds number. */
export function timestampToSeconds(ts: string | null): number {
  if (!ts) return 0;
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(ts) || 0;
}

export function formatTimestamp(ts: string | null): string {
  if (!ts) return "00:00";
  return ts;
}

/** Convert a number of seconds to a display string like 1:23 or 1:02:03 */
export function formatSecondsToTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Count non-overlapping occurrences of `needle` in `haystack` (case-insensitive). */
export function countOccurrences(haystack: string, needle: string): number {
  let count = 0, idx = 0;
  const h = haystack.toLowerCase(), n = needle.toLowerCase();
  while ((idx = h.indexOf(n, idx)) !== -1) { count++; idx += n.length; }
  return count;
}

/** Download a string as a file in the browser. */
export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Speaker colors ── */

export const SPEAKER_COLORS = [
  { bg: "bg-orange-100 dark:bg-orange-500/20", text: "text-orange-700 dark:text-orange-300", ring: "ring-orange-200 dark:ring-orange-500/30" },
  { bg: "bg-sky-100 dark:bg-sky-500/20", text: "text-sky-700 dark:text-sky-300", ring: "ring-sky-200 dark:ring-sky-500/30" },
  { bg: "bg-violet-100 dark:bg-violet-500/20", text: "text-violet-700 dark:text-violet-300", ring: "ring-violet-200 dark:ring-violet-500/30" },
  { bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-500/30" },
  { bg: "bg-rose-100 dark:bg-rose-500/20", text: "text-rose-700 dark:text-rose-300", ring: "ring-rose-200 dark:ring-rose-500/30" },
  { bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300", ring: "ring-amber-200 dark:ring-amber-500/30" },
];

export function getSpeakerColor(speaker: string | null, uniqueSpeakers: string[]) {
  if (!speaker) return SPEAKER_COLORS[0];
  const idx = uniqueSpeakers.indexOf(speaker);
  return SPEAKER_COLORS[(idx >= 0 ? idx : 0) % SPEAKER_COLORS.length];
}

export function getSpeakerInitials(speaker: string | null): string {
  if (!speaker) return "?";
  return speaker
    .split(/[\s_-]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ── Commenter colors (gradient, matching Editor Activity panel) ── */

export const COMMENTER_COLORS = [
  { bg: "bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-500/20 dark:to-amber-500/20", text: "text-orange-700 dark:text-orange-300", ring: "ring-orange-200/60 dark:ring-orange-500/30" },
  { bg: "bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-500/20 dark:to-indigo-500/20", text: "text-sky-700 dark:text-sky-300", ring: "ring-sky-200/60 dark:ring-sky-500/30" },
  { bg: "bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-500/20 dark:to-purple-500/20", text: "text-violet-700 dark:text-violet-300", ring: "ring-violet-200/60 dark:ring-violet-500/30" },
  { bg: "bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-500/20 dark:to-teal-500/20", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-200/60 dark:ring-emerald-500/30" },
  { bg: "bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-500/20 dark:to-pink-500/20", text: "text-rose-700 dark:text-rose-300", ring: "ring-rose-200/60 dark:ring-rose-500/30" },
];

export function getCommenterColor(userId: number | null): typeof COMMENTER_COLORS[number] {
  if (userId == null) return COMMENTER_COLORS[0];
  return COMMENTER_COLORS[(userId - 1) % COMMENTER_COLORS.length];
}

export function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
