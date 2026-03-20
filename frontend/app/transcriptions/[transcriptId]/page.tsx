"use client";

import { useEffect, useState, useRef, useCallback, type KeyboardEvent } from "react";
import { useParams } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TranscriptSection = {
  id: number;
  transcription_id: number;
  section_id: number;
  speaker: string | null;
  begin_timestamp: string | null;
  end_timestamp: string | null;
  original_text: string | null;
  edited_text: string | null;
  tags: string[];
  is_active: number;
};

type EditingState = {
  sectionId: number;
  field: "speaker" | "edited_text";
} | null;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Convert "00:01:23" or "83" (seconds) into seconds number. */
function timestampToSeconds(ts: string | null): number {
  if (!ts) return 0;
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(ts) || 0;
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return "00:00";
  return ts;
}

/* ------------------------------------------------------------------ */
/*  Inline‑edit component                                              */
/* ------------------------------------------------------------------ */

function InlineEdit({
  value,
  onSave,
  multiline = false,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape") cancel();
  };

  if (!editing) {
    return (
      <button
        type="button"
        className={`cursor-pointer rounded px-1.5 py-0.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 ${className}`}
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {value || <span className="italic text-zinc-400">empty</span>}
      </button>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        rows={4}
        className={`w-full rounded-xl border-2 border-orange-400 bg-orange-50/50 px-4 py-3 text-sm shadow-md shadow-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:border-orange-500/60 dark:bg-orange-500/5 dark:shadow-orange-500/10 ${className}`}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKey}
      className={`rounded-lg border-2 border-orange-400 bg-orange-50/50 px-3 py-1.5 text-sm shadow-md shadow-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:border-orange-500/60 dark:bg-orange-500/5 dark:shadow-orange-500/10 ${className}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Tag‑editor component                                               */
/* ------------------------------------------------------------------ */

function TagEditor({
  tags,
  onAdd,
  onRemove,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}) {
  const [input, setInput] = useState("");

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      const tag = input.trim().toLowerCase();
      if (!tags.includes(tag)) onAdd(tag);
      setInput("");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="group/tag inline-flex cursor-pointer items-center gap-1 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm transition-all hover:shadow dark:from-orange-500/15 dark:to-amber-500/15 dark:text-orange-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 opacity-50">
            <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="ml-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-orange-400 opacity-0 transition-all hover:bg-orange-200 hover:text-orange-700 group-hover/tag:opacity-100 dark:hover:bg-orange-500/30 dark:hover:text-orange-200"
            aria-label={`Remove tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder="+ Add tag…"
        className="w-28 cursor-pointer rounded-full border border-dashed border-zinc-300 bg-transparent px-3 py-1 text-xs font-medium placeholder:text-zinc-400 transition hover:border-orange-300 hover:bg-orange-50 focus:cursor-text focus:border-orange-400 focus:bg-transparent focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-zinc-600 dark:hover:border-orange-500/30 dark:hover:bg-orange-500/5 dark:focus:ring-orange-500/20"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Play button icon                                                   */
/* ------------------------------------------------------------------ */

function PlayIcon({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm10.5 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Searchable select component                                        */
/* ------------------------------------------------------------------ */

function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setSearch("");
  };

  const displayLabel = value || placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`cursor-pointer inline-flex items-center gap-2 rounded-xl border bg-zinc-50 py-2 pl-3 pr-3 text-sm font-medium shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 hover:shadow focus:outline-none dark:bg-zinc-800 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 ${
          open
            ? "border-orange-400 ring-2 ring-orange-200 dark:border-orange-500/50 dark:ring-orange-500/20"
            : "border-zinc-200 dark:border-zinc-700"
        }`}
      >
        <span className="flex-shrink-0 text-zinc-400">{icon}</span>
        <span className={value ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-500"}>
          {displayLabel}
        </span>
        {value && (
          <span
            onClick={(e) => { e.stopPropagation(); select(""); }}
            className="ml-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            aria-label="Clear filter"
          >
            ×
          </span>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
          {/* search input */}
          <div className="border-b border-zinc-100 p-2 dark:border-zinc-700">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400">
                <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-lg bg-zinc-50 py-1.5 pl-8 pr-3 text-sm placeholder:text-zinc-400 focus:outline-none dark:bg-zinc-900 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* options list */}
          <div className="max-h-48 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => select("")}
              className={`w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10 ${
                !value ? "font-semibold text-orange-600 dark:text-orange-400" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {placeholder}
            </button>
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-center text-xs text-zinc-400">No matches found</p>
            )}
            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => select(opt)}
                className={`w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10 ${
                  value === opt
                    ? "bg-orange-50 font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                    : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Word‑level diff helper                                             */
/* ------------------------------------------------------------------ */

type DiffSegment = { text: string; type: "equal" | "added" | "removed" };

/** Simple word‑level diff using longest‑common‑subsequence. */
function computeWordDiff(original: string, edited: string): DiffSegment[] {
  const a = original.split(/\s+/).filter(Boolean);
  const b = edited.split(/\s+/).filter(Boolean);

  // Build LCS table
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

  // Back‑track to produce segments
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

  // Merge consecutive segments of the same type
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

/* ------------------------------------------------------------------ */
/*  Diff modal                                                         */
/* ------------------------------------------------------------------ */

function DiffModal({
  section,
  onClose,
}: {
  section: TranscriptSection;
  onClose: () => void;
}) {
  const original = section.original_text ?? "";
  const edited = section.edited_text ?? original;
  const hasChanges = original !== edited;
  const segments = hasChanges ? computeWordDiff(original, edited) : [];

  // Close on Escape
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
              <p className="text-xs text-zinc-400">Section §{section.section_id} · {section.speaker ?? "Unknown"}</p>
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
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm bg-red-100 ring-1 ring-red-200 dark:bg-red-500/20 dark:ring-red-500/30" />
                  <span className="text-zinc-500">Removed</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm bg-emerald-100 ring-1 ring-emerald-200 dark:bg-emerald-500/20 dark:ring-emerald-500/30" />
                  <span className="text-zinc-500">Added</span>
                </span>
              </div>

              {/* Diff output */}
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

              {/* Side‑by‑side panels */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    Original
                  </p>
                  <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {original || <span className="italic text-zinc-300">empty</span>}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
                    Edited
                  </p>
                  <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {edited || <span className="italic text-zinc-300">empty</span>}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex justify-end border-t border-zinc-100 px-6 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function TranscriptEditorPage() {
  const params = useParams<{ transcriptId: string }>();
  const transcriptId = params.transcriptId;

  const [sections, setSections] = useState<TranscriptSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [playingSectionId, setPlayingSectionId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [filterSpeaker, setFilterSpeaker] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [diffSectionId, setDiffSectionId] = useState<number | null>(null);

  /* ---------- Fetch transcript sections ---------- */

  const fetchSections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transcriptions/${transcriptId}`);
      if (!res.ok) throw new Error(`Failed to load transcript (${res.status})`);
      const data: TranscriptSection[] = await res.json();
      setSections(
        [...data].sort((a, b) => (a.section_id ?? 0) - (b.section_id ?? 0))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [transcriptId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  /* ---------- Persist a field change ---------- */

  const saveField = async (
    sectionDbId: number,
    field: "speaker" | "edited_text",
    value: string
  ) => {
    setSavingId(sectionDbId);
    try {
      const res = await fetch(`/api/transcriptions/sections/${sectionDbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSections((prev) =>
        prev.map((s) => (s.id === sectionDbId ? { ...s, [field]: value } : s))
      );
    } catch {
      alert("Failed to save – please try again.");
    } finally {
      setSavingId(null);
    }
  };

  const saveTags = async (sectionDbId: number, tags: string[]) => {
    setSavingId(sectionDbId);
    try {
      const res = await fetch(`/api/transcriptions/sections/${sectionDbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSections((prev) =>
        prev.map((s) => (s.id === sectionDbId ? { ...s, tags } : s))
      );
    } catch {
      alert("Failed to save – please try again.");
    } finally {
      setSavingId(null);
    }
  };

  /* ---------- Tag helpers ---------- */

  const handleAddTag = (sectionDbId: number, currentTags: string[], newTag: string) => {
    const updated = [...currentTags, newTag];
    saveTags(sectionDbId, updated);
  };

  const handleRemoveTag = (sectionDbId: number, currentTags: string[], removeTag: string) => {
    const updated = currentTags.filter((t) => t !== removeTag);
    saveTags(sectionDbId, updated);
  };

  /* ---------- Playback simulation ---------- */

  const handlePlay = (section: TranscriptSection) => {
    // If already playing this section, stop
    if (playingSectionId === section.id) {
      stopPlayback();
      return;
    }

    stopPlayback();

    const startSec = timestampToSeconds(section.begin_timestamp);
    const endSec = timestampToSeconds(section.end_timestamp);
    const duration = endSec - startSec || 10;

    setPlayingSectionId(section.id);
    setCurrentTime(0);

    playTimerRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) {
          stopPlayback();
          return 0;
        }
        return prev + 0.25;
      });
    }, 250);
  };

  const stopPlayback = () => {
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    playTimerRef.current = null;
    setPlayingSectionId(null);
    setCurrentTime(0);
  };

  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, []);

  /* ---------- Derived data ---------- */

  const uniqueSpeakers = Array.from(new Set(sections.map((s) => s.speaker).filter(Boolean))) as string[];
  const allTags = Array.from(new Set(sections.flatMap((s) => s.tags)));

  const filteredSections = sections.filter((s) => {
    if (filterSpeaker && s.speaker !== filterSpeaker) return false;
    if (filterTag && !s.tags.includes(filterTag)) return false;
    return true;
  });

  /* ---------- Speaker color helper ---------- */

  const speakerColors = [
    { bg: "bg-orange-100 dark:bg-orange-500/20", text: "text-orange-700 dark:text-orange-300", ring: "ring-orange-200 dark:ring-orange-500/30" },
    { bg: "bg-sky-100 dark:bg-sky-500/20", text: "text-sky-700 dark:text-sky-300", ring: "ring-sky-200 dark:ring-sky-500/30" },
    { bg: "bg-violet-100 dark:bg-violet-500/20", text: "text-violet-700 dark:text-violet-300", ring: "ring-violet-200 dark:ring-violet-500/30" },
    { bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-500/30" },
    { bg: "bg-rose-100 dark:bg-rose-500/20", text: "text-rose-700 dark:text-rose-300", ring: "ring-rose-200 dark:ring-rose-500/30" },
    { bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-300", ring: "ring-amber-200 dark:ring-amber-500/30" },
  ];

  const getSpeakerColor = (speaker: string | null) => {
    if (!speaker) return speakerColors[0];
    const idx = uniqueSpeakers.indexOf(speaker);
    return speakerColors[(idx >= 0 ? idx : 0) % speakerColors.length];
  };

  const getSpeakerInitials = (speaker: string | null) => {
    if (!speaker) return "?";
    return speaker
      .split(/[\s_-]+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500 dark:border-orange-800 dark:border-t-orange-400" />
        </div>
        <p className="text-sm font-medium text-zinc-400 animate-pulse">Loading transcript…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex flex-col items-center justify-center gap-6 py-24">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-red-500">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{error}</p>
          <p className="mt-1 text-xs text-zinc-400">Something went wrong loading this transcript.</p>
        </div>
        <button
          onClick={fetchSections}
          className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:shadow-orange-500/40 hover:brightness-110 active:scale-[0.98]"
        >
          Try Again
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-8">
      {/* ── Header ── */}
      <div className="relative rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* decorative gradient strip */}
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500" />

        <div className="p-6 pt-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-md shadow-orange-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-white">
                    <path fillRule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 0 0 3 3h15a3 3 0 0 1-3-3V4.875C17.25 3.839 16.41 3 15.375 3H4.125ZM12 9.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H12Zm-.75-2.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75ZM6 12.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5H6Zm-.75 3.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75ZM6 6.75a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-3A.75.75 0 0 0 9 6.75H6Z" clipRule="evenodd" />
                    <path d="M18.75 6.75h1.875c.621 0 1.125.504 1.125 1.125V18a1.5 1.5 0 0 1-3 0V6.75Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Transcript #{transcriptId}
                  </h2>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">Click any field to edit inline</p>
                </div>
              </div>

              {/* stats row */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
                  </svg>
                  {sections.length} section{sections.length !== 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                  </svg>
                  {uniqueSpeakers.length} speaker{uniqueSpeakers.length !== 1 ? "s" : ""}
                </span>
                {allTags.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    {allTags.length} tag{allTags.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <SearchSelect
                value={filterSpeaker}
                onChange={setFilterSpeaker}
                options={uniqueSpeakers}
                placeholder="All speakers"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                  </svg>
                }
              />

              <SearchSelect
                value={filterTag}
                onChange={setFilterTag}
                options={allTags}
                placeholder="All tags"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Playback bar ── */}
      {playingSectionId !== null && (() => {
        const playingSec = sections.find((s) => s.id === playingSectionId);
        const totalDur = playingSec
          ? (timestampToSeconds(playingSec.end_timestamp) - timestampToSeconds(playingSec.begin_timestamp)) || 10
          : 10;
        return (
          <div className="sticky top-0 z-20 flex items-center gap-4 rounded-2xl border border-orange-200/80 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 px-5 py-3.5 shadow-lg shadow-orange-500/10 backdrop-blur dark:border-orange-500/20 dark:from-orange-500/5 dark:via-amber-500/10 dark:to-orange-500/5">
            <button
              type="button"
              onClick={stopPlayback}
              className="cursor-pointer rounded-full bg-gradient-to-br from-orange-500 to-amber-500 p-2.5 text-white shadow-md shadow-orange-500/30 transition hover:shadow-orange-500/50 hover:brightness-110 active:scale-95"
              aria-label="Stop playback"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
              </svg>
            </button>

            <div className="flex flex-1 items-center gap-3">
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                {playingSec?.speaker ?? "Unknown"}
              </span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-orange-200/60 dark:bg-orange-800/40">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-200"
                  style={{ width: `${Math.min((currentTime / totalDur) * 100, 100)}%` }}
                />
                <div
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-white bg-orange-500 shadow transition-all duration-200 dark:border-zinc-900"
                  style={{ left: `calc(${Math.min((currentTime / totalDur) * 100, 100)}% - 7px)` }}
                />
              </div>
            </div>

            <span className="min-w-[3.5rem] text-right font-mono text-xs font-semibold text-orange-600 dark:text-orange-300">
              {currentTime.toFixed(1)}s
            </span>
          </div>
        );
      })()}

      {/* ── Section list ── */}
      <div className="space-y-4">
        {filteredSections.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-zinc-300 dark:text-zinc-600">
              <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">No sections match the current filters.</p>
            <button
              type="button"
              onClick={() => { setFilterSpeaker(""); setFilterTag(""); }}
              className="mt-1 text-xs font-semibold text-orange-500 hover:text-orange-600 dark:text-orange-400"
            >
              Clear filters
            </button>
          </div>
        )}

        {filteredSections.map((section, idx) => {
          const tags = section.tags;
          const isPlaying = playingSectionId === section.id;
          const isSaving = savingId === section.id;
          const color = getSpeakerColor(section.speaker);

          return (
            <div
              key={section.id}
              className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:bg-zinc-900 ${
                isPlaying
                  ? "border-orange-300 shadow-orange-100 ring-2 ring-orange-200/70 dark:border-orange-500/50 dark:shadow-orange-500/5 dark:ring-orange-500/20"
                  : "border-zinc-200/80 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
              }`}
            >
              {/* left accent stripe */}
              <div className={`absolute inset-y-0 left-0 w-1 ${isPlaying ? "bg-gradient-to-b from-orange-400 to-amber-400" : color.bg}`} />

              {/* saving indicator */}
              {isSaving && (
                <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                  Saving…
                </div>
              )}

              <div className="p-5 pl-6">
                {/* ── Row 1: speaker + timestamps + play ── */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handlePlay(section)}
                    className={`cursor-pointer rounded-full p-2.5 transition-all duration-200 ${
                      isPlaying
                        ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30 hover:shadow-orange-500/50 hover:brightness-110 active:scale-95"
                        : "bg-zinc-100 text-zinc-500 hover:bg-orange-100 hover:text-orange-600 hover:shadow-sm dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-orange-500/15 dark:hover:text-orange-400"
                    }`}
                    aria-label={isPlaying ? "Pause section" : "Play section"}
                  >
                    <PlayIcon playing={isPlaying} />
                  </button>

                  {/* speaker avatar + name */}
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ring-2 ${color.bg} ${color.text} ${color.ring}`}>
                      {getSpeakerInitials(section.speaker)}
                    </div>
                    <InlineEdit
                      value={section.speaker ?? ""}
                      onSave={(v) => saveField(section.id, "speaker", v)}
                      className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-mono text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-zinc-400">
                        <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
                      </svg>
                      {formatTimestamp(section.begin_timestamp)} → {formatTimestamp(section.end_timestamp)}
                    </span>
                  </div>

                  <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                    §{section.section_id}
                  </span>
                </div>

                {/* ── Row 2: transcript text ── */}
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600">
                        <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
                        <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                      </svg>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        Transcript Text
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDiffSectionId(section.id)}
                      className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                        (section.edited_text ?? null) !== null && section.edited_text !== section.original_text
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
                          : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-700"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                        <path d="M8 1a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 8 1ZM3 9.5a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 9.5ZM3.75 12a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z" />
                      </svg>
                      {(section.edited_text ?? null) !== null && section.edited_text !== section.original_text
                        ? "View Changes"
                        : "Compare"
                      }
                    </button>
                  </div>
                  <InlineEdit
                    value={section.edited_text ?? section.original_text ?? ""}
                    onSave={(v) => saveField(section.id, "edited_text", v)}
                    multiline
                    className="block w-full rounded-xl text-sm leading-relaxed"
                  />
                </div>

                {/* ── Row 3: tags ── */}
                <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-zinc-300 dark:text-zinc-600">
                      <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Tags
                    </p>
                  </div>
                  <TagEditor
                    tags={tags}
                    onAdd={(tag) => handleAddTag(section.id, tags, tag)}
                    onRemove={(tag) => handleRemoveTag(section.id, tags, tag)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Diff modal ── */}
      {diffSectionId !== null && (() => {
        const sec = sections.find((s) => s.id === diffSectionId);
        if (!sec) return null;
        return <DiffModal section={sec} onClose={() => setDiffSectionId(null)} />;
      })()}
    </section>
  );
}
