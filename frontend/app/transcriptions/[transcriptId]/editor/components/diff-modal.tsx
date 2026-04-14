"use client";

import { useState, useEffect } from "react";
import type { TranscriptSection } from "../lib/types";

/* ── Word-level diff ── */

type DiffSegment = { text: string; type: "equal" | "added" | "removed" };

export function computeWordDiff(original: string, edited: string): DiffSegment[] {
  const a = original.split(/\s+/).filter(Boolean);
  const b = edited.split(/\s+/).filter(Boolean);

  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

  const segments: DiffSegment[] = [];
  let i = m, j = n;
  const stack: DiffSegment[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      stack.push({ text: a[i - 1], type: "equal" });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ text: b[j - 1], type: "added" });
      j--;
    } else {
      stack.push({ text: a[i - 1], type: "removed" });
      i--;
    }
  }
  stack.reverse();

  for (const seg of stack) {
    const last = segments[segments.length - 1];
    if (last && last.type === seg.type) {
      last.text += " " + seg.text;
    } else {
      segments.push({ ...seg });
    }
  }
  return segments;
}

/* ── DiffModal ── */

export default function DiffModal({
  section,
  onClose,
  onSave,
}: {
  section: TranscriptSection;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const original = section.original_text ?? "";
  const [draft, setDraft] = useState(section.edited_text ?? original);
  const [saving, setSaving] = useState(false);
  const hasChanges = original !== draft;
  const segments = hasChanges ? computeWordDiff(original, draft) : [];
  const isDirty = draft !== (section.edited_text ?? original);

  const handleSave = async () => {
    setSaving(true);
    onSave(draft);
    setSaving(false);
  };

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
                <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">View Differences</h3>
              <p className="text-xs text-zinc-400">{section.speaker ?? "Unknown"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "calc(85vh - 130px)" }}>
          {!hasChanges ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-emerald-600 dark:text-emerald-400">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">No changes detected</p>
              <p className="text-xs text-zinc-400">The edited text matches the original.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm leading-relaxed dark:border-zinc-700 dark:bg-zinc-800/60">
                {segments.map((seg, idx) => {
                  if (seg.type === "removed") {
                    return (
                      <span key={idx} className="rounded-sm bg-red-100 px-0.5 text-red-700 line-through decoration-red-300 dark:bg-red-500/20 dark:text-red-300 dark:decoration-red-500/50">
                        {seg.text}{" "}
                      </span>
                    );
                  }
                  if (seg.type === "added") {
                    return (
                      <span key={idx} className="rounded-sm bg-emerald-100 px-0.5 font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                        {seg.text}{" "}
                      </span>
                    );
                  }
                  return <span key={idx}>{seg.text} </span>;
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    Original
                  </p>
                  <p className="flex-1 rounded-xl bg-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {original || <span className="italic text-zinc-300">empty</span>}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
                    Modified
                  </p>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                    className="flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-600 transition focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:focus:border-orange-500/50 dark:focus:bg-zinc-900 dark:focus:ring-orange-500/20"
                    placeholder="Edit the text…"
                  />
                </div>
              </div>

              {isDirty && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/20 transition hover:shadow-lg hover:shadow-orange-500/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                      </svg>
                    )}
                    Save changes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
