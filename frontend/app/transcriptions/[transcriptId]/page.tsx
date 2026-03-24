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

type TranscriptComment = {
  id: number;
  transcription_id: number;
  section_id: number | null;
  comment: string | null;
  created_by: number | null;
  created_at: string | null;
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

/** Convert a number of seconds to a display string like 1:23 or 1:02:03 */
function formatSecondsToTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Search‑highlight helper                                            */
/* ------------------------------------------------------------------ */

function HighlightText({
  text,
  query,
  matchOffset = 0,
  activeMatchIndex = -1,
}: {
  text: string;
  query: string;
  matchOffset?: number;
  activeMatchIndex?: number;
}) {
  if (!query) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  let matchCounter = matchOffset;
  return (
    <>
      {parts.map((part, i) => {
        if (regex.test(part)) {
          const idx = matchCounter++;
          const isActive = idx === activeMatchIndex;
          return (
            <mark
              key={i}
              data-search-match={idx}
              className={`rounded-sm px-0.5 transition-colors ${
                isActive
                  ? "bg-orange-400 text-white ring-2 ring-orange-400/50 dark:bg-orange-500 dark:ring-orange-500/50"
                  : "bg-amber-200 text-amber-900 dark:bg-amber-500/30 dark:text-amber-200"
              }`}
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline‑edit component                                              */
/* ------------------------------------------------------------------ */

function InlineEdit({
  value,
  onSave,
  onEditStart,
  multiline = false,
  className = "",
  highlight = "",
  matchOffset = 0,
  activeMatchIndex = -1,
}: {
  value: string;
  onSave: (v: string) => void;
  onEditStart?: () => void;
  multiline?: boolean;
  className?: string;
  highlight?: string;
  matchOffset?: number;
  activeMatchIndex?: number;
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
    if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
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
        onClick={() => { onEditStart?.(); setEditing(true); }}
        title="Click to edit"
      >
        {value ? <HighlightText text={value} query={highlight} matchOffset={matchOffset} activeMatchIndex={activeMatchIndex} /> : <span className="italic text-zinc-400">empty</span>}
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
  highlight = "",
  matchOffset = 0,
  activeMatchIndex = -1,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  highlight?: string;
  matchOffset?: number;
  activeMatchIndex?: number;
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

  // Compute per-tag offsets
  const tagOffsets: number[] = [];
  let runningOffset = matchOffset;
  for (const tag of tags) {
    tagOffsets.push(runningOffset);
    if (highlight) {
      const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matches = tag.match(new RegExp(escaped, "gi"));
      runningOffset += matches ? matches.length : 0;
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag, i) => (
        <span
          key={tag}
          className="group/tag inline-flex cursor-pointer items-center gap-1 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm transition-all hover:shadow dark:from-orange-500/15 dark:to-amber-500/15 dark:text-orange-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 opacity-50">
            <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <HighlightText text={tag} query={highlight} matchOffset={tagOffsets[i]} activeMatchIndex={activeMatchIndex} />
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
  className: wrapperClassName = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  icon: React.ReactNode;
  className?: string;
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
    <div ref={containerRef} className={`relative ${wrapperClassName}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-xl border bg-zinc-50 py-2 pl-3 pr-3 text-sm font-medium shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 hover:shadow focus:outline-none dark:bg-zinc-800 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 ${
          open
            ? "border-orange-400 ring-2 ring-orange-200 dark:border-orange-500/50 dark:ring-orange-500/20"
            : "border-zinc-200 dark:border-zinc-700"
        }`}
      >
        <span className="flex-shrink-0 text-zinc-400">{icon}</span>
        <span className={`truncate ${value ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-500"}`}>
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

              {/* Save button */}
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

/* ------------------------------------------------------------------ */
/*  Comment popover                                                    */
/* ------------------------------------------------------------------ */

function CommentPopover({
  transcriptId,
  sectionId,
  comments,
  loadingComments,
  onCommentAdded,
  onClose,
}: {
  transcriptId: string;
  sectionId: number;
  comments: TranscriptComment[];
  loadingComments: boolean;
  onCommentAdded: (silent?: boolean) => void;
  onClose: () => void;
}) {
  const sectionComments = comments.filter((c) => c.section_id === sectionId);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [optimisticComments, setOptimisticComments] = useState<TranscriptComment[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  // Scroll to bottom on mount and when comments change
  useEffect(() => {
    scrollToBottom();
  }, [sectionComments.length, optimisticComments.length, scrollToBottom]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    const text = newComment.trim();
    setSubmitting(true);
    // Optimistically add the comment to the list immediately
    const tempComment: TranscriptComment = {
      id: Date.now(),
      transcription_id: Number(transcriptId),
      section_id: sectionId,
      comment: text,
      created_by: null,
      created_at: new Date().toISOString(),
      is_active: 1,
    };
    setOptimisticComments((prev) => [...prev, tempComment]);
    setNewComment("");
    try {
      const res = await fetch(`/api/transcriptions/${transcriptId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId, comment: text }),
      });
      if (!res.ok) throw new Error("Failed to create comment");
      // Silently refetch to sync with server, then clear optimistic state
      await onCommentAdded(true);
      setOptimisticComments([]);
    } catch {
      // Remove optimistic comment on failure
      setOptimisticComments((prev) => prev.filter((c) => c.id !== tempComment.id));
      setNewComment(text);
      alert("Failed to post comment – please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div ref={popoverRef} className="absolute right-0 top-full z-40 mt-2 w-96 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-sky-500">
            <path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317 .713 2.435 0 3.277 0 4.26v4.48ZM5 6.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 6.5Zm.75 1.75a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {(sectionComments.length + optimisticComments.length)} comment{(sectionComments.length + optimisticComments.length) !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      {/* Comment list */}
      <div ref={listRef} className="max-h-[280px] overflow-y-auto">
        {loadingComments ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            <span className="text-xs text-zinc-400">Loading…</span>
          </div>
        ) : sectionComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-6">
            <p className="text-xs font-medium text-zinc-400">No comments yet</p>
            <p className="text-[10px] text-zinc-300 dark:text-zinc-600">Be the first to comment.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {[...sectionComments, ...optimisticComments].map((c) => (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 text-[10px] font-bold text-sky-700 ring-1 ring-sky-200/60 dark:from-sky-500/20 dark:to-indigo-500/20 dark:text-sky-300 dark:ring-sky-500/30">
                    U{c.created_by ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                        User {c.created_by ?? "Unknown"}
                      </span>
                      <span className="text-[10px] text-zinc-400">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="mt-0.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {c.comment ?? ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New comment form */}
      <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-start gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment…"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm placeholder:text-zinc-400 transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:placeholder:text-zinc-500 dark:focus:border-sky-500/50 dark:focus:bg-zinc-900 dark:focus:ring-sky-500/20"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
            className="cursor-pointer mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm shadow-sky-500/20 transition hover:shadow-sky-500/40 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Post comment"
          >
            {submitting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M2.87 2.298a.75.75 0 0 0-.812 1.021L3.39 6.624a1 1 0 0 0 .928.626H8.25a.75.75 0 0 1 0 1.5H4.318a1 1 0 0 0-.927.626l-1.333 3.305a.75.75 0 0 0 .812 1.021l11.07-3.548a.75.75 0 0 0 0-1.408L2.87 2.298Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline comment input (always visible)                              */
/* ------------------------------------------------------------------ */

function InlineCommentInput({
  transcriptId,
  sectionId,
  onCommentAdded,
}: {
  transcriptId: string;
  sectionId: number;
  onCommentAdded: () => void;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!value.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/transcriptions/${transcriptId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId, comment: value.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create comment");
      setValue("");
      onCommentAdded();
    } catch {
      alert("Failed to post comment – please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
    }
  };

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); autoResize(); }}
        placeholder="Add a comment…"
        rows={1}
        className="flex-1 resize-none overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs placeholder:text-zinc-400 transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:placeholder:text-zinc-500 dark:focus:border-sky-500/50 dark:focus:bg-zinc-900 dark:focus:ring-sky-500/20"
        style={{ minHeight: "28px", maxHeight: "80px" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!value.trim() || submitting}
        className="cursor-pointer flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm shadow-sky-500/20 transition hover:shadow-sky-500/40 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Post comment"
      >
        {submitting ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
            <path d="M2.87 2.298a.75.75 0 0 0-.812 1.021L3.39 6.624a1 1 0 0 0 .928.626H8.25a.75.75 0 0 1 0 1.5H4.318a1 1 0 0 0-.927.626l-1.333 3.305a.75.75 0 0 0 .812 1.021l11.07-3.548a.75.75 0 0 0 0-1.408L2.87 2.298Z" />
          </svg>
        )}
      </button>
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

  // Global audio player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerTime, setPlayerTime] = useState(0); // global time in seconds
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackSpeedRef = useRef(1);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  const [filterSpeaker, setFilterSpeaker] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [diffSectionId, setDiffSectionId] = useState<number | null>(null);
  const [comments, setComments] = useState<TranscriptComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentSectionId, setCommentSectionId] = useState<number | null>(null);
  const [sidebarPanel, setSidebarPanel] = useState<{ sectionId: number; panel: "notes" | "tags" | "edits" } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ---------- Fetch comments ---------- */

  const fetchComments = useCallback(async (silent = false) => {
    if (!silent) setLoadingComments(true);
    try {
      const res = await fetch(`/api/transcriptions/${transcriptId}/comments`);
      if (!res.ok) throw new Error("Failed to load comments");
      const data: TranscriptComment[] = await res.json();
      setComments(data);
    } catch {
      /* silently ignore – comments are non-critical */
    } finally {
      if (!silent) setLoadingComments(false);
    }
  }, [transcriptId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

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

  /* ---------- Global audio player ---------- */

  // Compute total transcript duration from all sections
  const totalDuration = sections.length > 0
    ? Math.max(...sections.map((s) => timestampToSeconds(s.end_timestamp)))
    : 0;

  // Determine which section is active based on playerTime
  const activeSectionId = (() => {
    for (let i = sections.length - 1; i >= 0; i--) {
      const s = sections[i];
      if (playerTime >= timestampToSeconds(s.begin_timestamp) && playerTime < timestampToSeconds(s.end_timestamp)) {
        return s.id;
      }
    }
    return null;
  })();

  const activeSection = activeSectionId !== null ? sections.find((s) => s.id === activeSectionId) : null;

  // Keep a ref to the last known active section so we don't flash during gaps
  const lastActiveSectionRef = useRef<typeof activeSection>(null);
  if (activeSection) {
    lastActiveSectionRef.current = activeSection;
  }
  // Show the current active section, or fall back to the last one during brief gaps
  const displaySection = activeSection ?? lastActiveSectionRef.current;

  const startPlayback = useCallback(() => {
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    setIsPlaying(true);
    playTimerRef.current = setInterval(() => {
      setPlayerTime((prev) => {
        const increment = 0.25 * playbackSpeedRef.current;
        if (prev >= totalDuration) {
          clearInterval(playTimerRef.current!);
          playTimerRef.current = null;
          setIsPlaying(false);
          return totalDuration;
        }
        return prev + increment;
      });
    }, 250);
  }, [totalDuration]);

  // Keep the ref in sync and restart timer when speed changes during playback
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    if (isPlaying) {
      // Restart the interval with the new speed
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      playTimerRef.current = setInterval(() => {
        setPlayerTime((prev) => {
          const increment = 0.25 * playbackSpeedRef.current;
          if (prev >= totalDuration) {
            clearInterval(playTimerRef.current!);
            playTimerRef.current = null;
            setIsPlaying(false);
            return totalDuration;
          }
          return prev + increment;
        });
      }, 250);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackSpeed]);

  // Close speed menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setSpeedMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pausePlayback = useCallback(() => {
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    playTimerRef.current = null;
    setIsPlaying(false);
  }, []);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pausePlayback();
    } else {
      // If at the end, restart
      if (playerTime >= totalDuration) setPlayerTime(0);
      startPlayback();
    }
  }, [isPlaying, playerTime, totalDuration, startPlayback, pausePlayback]);

  const seekTo = useCallback((time: number) => {
    setPlayerTime(Math.max(0, Math.min(time, totalDuration)));
  }, [totalDuration]);

  const handlePlay = (section: TranscriptSection) => {
    // If this section is already playing, toggle pause
    if (activeSectionId === section.id && isPlaying) {
      pausePlayback();
      return;
    }
    // If this section is active but paused, just resume without seeking
    if (activeSectionId === section.id && !isPlaying) {
      startPlayback();
      return;
    }
    // Different section — seek to its start
    const startSec = timestampToSeconds(section.begin_timestamp);
    seekTo(startSec);
    // Small delay to let state update, then start
    setTimeout(() => startPlayback(), 50);
  };

  const sectionListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active section within the section list container
  useEffect(() => {
    if (activeSectionId !== null && isPlaying && sectionListRef.current) {
      const el = sectionListRef.current.querySelector(`[data-section-id="${activeSectionId}"]`) as HTMLElement | null;
      if (el) {
        const container = sectionListRef.current;
        const elTop = el.offsetTop - container.offsetTop;
        container.scrollTo({ top: elTop - 8, behavior: "smooth" });
      }
    }
  }, [activeSectionId, isPlaying]);

  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, []);

  // Global keyboard shortcuts: Space = play/pause, Left/Right arrows = ±5s
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      // Don't intercept when the user is typing in an input, textarea, or contentEditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlayback();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seekTo(playerTime - 5);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seekTo(playerTime + 5);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlayback, seekTo, playerTime]);

  /* ---------- Derived data ---------- */

  const uniqueSpeakers = Array.from(new Set(sections.map((s) => s.speaker).filter(Boolean))) as string[];
  const allTags = Array.from(new Set(sections.flatMap((s) => s.tags)));

  const filteredSections = sections.filter((s) => {
    if (filterSpeaker && s.speaker !== filterSpeaker) return false;
    if (filterTag && !s.tags.includes(filterTag)) return false;
    return true;
  });



  /* ---------- Search match count & per-section offsets ---------- */

  const countOccurrences = (haystack: string, needle: string) => {
    let count = 0, idx = 0;
    const h = haystack.toLowerCase(), n = needle.toLowerCase();
    while ((idx = h.indexOf(n, idx)) !== -1) { count++; idx += n.length; }
    return count;
  };

  const sectionMatchOffsets = new Map<number, number>();
  let totalMatches = 0;
  if (searchQuery) {
    for (const s of filteredSections) {
      sectionMatchOffsets.set(s.id, totalMatches);
      totalMatches += countOccurrences(s.edited_text ?? s.original_text ?? "", searchQuery);
    }
  }

  // Reset match index when query or results change, and scroll to first match
  useEffect(() => {
    setSearchMatchIndex(0);
    if (searchQuery) {
      setTimeout(() => {
        const el = document.querySelector('[data-search-match="0"]');
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  }, [searchQuery, filterSpeaker, filterTag]);

  // Scroll to active match
  const scrollToMatch = useCallback((idx: number) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-search-match="${idx}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, []);

  const goToNextMatch = useCallback(() => {
    if (totalMatches === 0) return;
    const next = (searchMatchIndex + 1) % totalMatches;
    setSearchMatchIndex(next);
    scrollToMatch(next);
  }, [totalMatches, searchMatchIndex, scrollToMatch]);

  const goToPrevMatch = useCallback(() => {
    if (totalMatches === 0) return;
    const prev = (searchMatchIndex - 1 + totalMatches) % totalMatches;
    setSearchMatchIndex(prev);
    scrollToMatch(prev);
  }, [totalMatches, searchMatchIndex, scrollToMatch]);

  /* ---------- Export helpers ---------- */

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsText = () => {
    const lines = sections.map((s) => {
      const speaker = s.speaker ?? "Unknown";
      const time = `[${formatTimestamp(s.begin_timestamp)} → ${formatTimestamp(s.end_timestamp)}]`;
      const text = s.edited_text ?? s.original_text ?? "";
      const tagLine = s.tags.length > 0 ? `  Tags: ${s.tags.join(", ")}` : "";
      return `${speaker} ${time}\n${text}${tagLine ? "\n" + tagLine : ""}`;
    });
    const content = `Transcript #${transcriptId}\n${"=".repeat(40)}\n\n${lines.join("\n\n")}`;
    downloadFile(content, `transcript-${transcriptId}.txt`, "text/plain;charset=utf-8");
  };

  const exportAsJson = () => {
    const data = {
      transcriptId,
      exportedAt: new Date().toISOString(),
      sections: sections.map((s) => ({
        sectionId: s.section_id,
        speaker: s.speaker,
        beginTimestamp: s.begin_timestamp,
        endTimestamp: s.end_timestamp,
        originalText: s.original_text,
        editedText: s.edited_text,
        tags: s.tags,
      })),
    };
    downloadFile(JSON.stringify(data, null, 2), `transcript-${transcriptId}.json`, "application/json");
  };

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
    <section className="flex flex-col h-[calc(100vh-5rem)] -m-6">
      {/* ── Top area: Header with Audio Player ── */}
      <div className="flex-shrink-0 relative mx-6 mt-6 rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* decorative gradient strip */}
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500" />

        <div className="p-5 pt-6">
          {/* Row 1: Title + Search + Export */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-md shadow-orange-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-white">
                  <path fillRule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 0 0 3 3h15a3 3 0 0 1-3-3V4.875C17.25 3.839 16.41 3 15.375 3H4.125ZM12 9.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H12Zm-.75-2.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75ZM6 12.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5H6Zm-.75 3.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75ZM6 6.75a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-3A.75.75 0 0 0 9 6.75H6Z" clipRule="evenodd" />
                  <path d="M18.75 6.75h1.875c.621 0 1.125.504 1.125 1.125V18a1.5 1.5 0 0 1-3 0V6.75Z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Transcript #{transcriptId}
              </h2>

              <div className="ml-2 flex items-center gap-2">
                <SearchSelect
                  value={filterSpeaker}
                  onChange={setFilterSpeaker}
                  options={uniqueSpeakers}
                  placeholder="All speakers"
                  className="w-40"
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
                  className="w-40"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">

            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400">
                <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery) {
                    e.preventDefault();
                    if (e.shiftKey) goToPrevMatch(); else goToNextMatch();
                  }
                }}
                placeholder="Search transcript…"
                className={`w-64 rounded-xl border bg-zinc-50 py-2 pl-9 text-sm font-medium placeholder:text-zinc-400 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:bg-zinc-800 dark:placeholder:text-zinc-500 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 dark:focus:border-orange-500/50 dark:focus:ring-orange-500/20 ${
                  searchQuery ? "pr-20 border-orange-300 dark:border-orange-500/40" : "pr-8 border-zinc-200 dark:border-zinc-700"
                }`}
              />
              {searchQuery && (
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <span className="text-[10px] font-semibold tabular-nums text-zinc-400">
                    {totalMatches > 0 ? `${searchMatchIndex + 1}/${totalMatches}` : "0/0"}
                  </span>
                  <button
                    type="button"
                    onClick={goToPrevMatch}
                    disabled={totalMatches === 0}
                    className="flex h-4 w-4 cursor-pointer items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 disabled:cursor-default disabled:opacity-30 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                    aria-label="Previous match"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={goToNextMatch}
                    disabled={totalMatches === 0}
                    className="flex h-4 w-4 cursor-pointer items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 disabled:cursor-default disabled:opacity-30 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                    aria-label="Next match"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* export dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportOpen((prev) => !prev)}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-xl border bg-zinc-50 px-3 py-2 text-xs font-semibold shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 hover:shadow dark:bg-zinc-800 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 dark:hover:text-orange-300 ${
                  exportOpen
                    ? "border-orange-400 text-orange-700 ring-2 ring-orange-200 dark:border-orange-500/50 dark:text-orange-300 dark:ring-orange-500/20"
                    : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Zm4 3.5a.75.75 0 0 1 .75.75v2.69l.72-.72a.75.75 0 1 1 1.06 1.06l-2 2a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 0 1 1.06-1.06l.72.72V6.25A.75.75 0 0 1 8 5.5Z" clipRule="evenodd" />
                </svg>
                Export
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`h-3 w-3 text-zinc-400 transition-transform ${exportOpen ? "rotate-180" : ""}`}>
                  <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>

              {exportOpen && (
                <div className="absolute right-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => { exportAsText(); setExportOpen(false); }}
                      className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-zinc-500 dark:text-zinc-400">
                          <path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4ZM5.25 7.5A.75.75 0 0 1 6 6.75h4a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-700 dark:text-zinc-200">Text file</p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Transcript-style .txt</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { exportAsJson(); setExportOpen(false); }}
                      className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-zinc-500 dark:text-zinc-400">
                          <path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Zm1 5.75a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm3 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75ZM5.75 10a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Zm2.25.75a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-700 dark:text-zinc-200">JSON file</p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Structured data .json</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>

        {/* ── Audio Player ── */}
        <div className="border-t border-zinc-200/80 pb-3 dark:border-zinc-800">
          {/* progress bar (clickable) */}
          <div
            className="group/progress relative h-1.5 w-full cursor-pointer bg-zinc-200/60 transition-all hover:h-2.5 dark:bg-zinc-700/60"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              seekTo(pct * totalDuration);
            }}
          >
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-200"
              style={{ width: `${totalDuration > 0 ? (playerTime / totalDuration) * 100 : 0}%` }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-orange-500 shadow opacity-0 transition-all duration-200 group-hover/progress:opacity-100 dark:border-zinc-900"
              style={{ left: `calc(${totalDuration > 0 ? (playerTime / totalDuration) * 100 : 0}% - 6px)` }}
            />
          </div>

          <div className="flex items-center gap-4 px-5 py-2.5">
            {/* Left: controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => seekTo(playerTime - 10)}
                className="cursor-pointer rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label="Skip back 10 seconds"
                title="Back 10s"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path d="M12.5 4V2L9 5.5l3.5 3V6.5c3.59 0 6.5 2.91 6.5 6.5s-2.91 6.5-6.5 6.5S6 16.59 6 13H4c0 4.69 3.81 8.5 8.5 8.5s8.5-3.81 8.5-8.5-3.81-8.5-8.5-8.5Z" fill="currentColor" />
                  <text x="12.5" y="15.5" textAnchor="middle" fontSize="7.5" fontWeight="bold" fontFamily="system-ui, sans-serif" fill="currentColor">10</text>
                </svg>
              </button>

              <button
                type="button"
                onClick={togglePlayback}
                className={`cursor-pointer rounded-full p-2.5 transition-all duration-200 ${
                  isPlaying
                    ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:brightness-110 active:scale-95"
                    : "bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 hover:brightness-110 active:scale-95"
                }`}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm10.5 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={() => seekTo(playerTime + 10)}
                className="cursor-pointer rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label="Skip forward 10 seconds"
                title="Forward 10s"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path d="M11.5 4V2l3.5 3.5-3.5 3V6.5C7.91 6.5 5 9.41 5 13s2.91 6.5 6.5 6.5S18 16.59 18 13h2c0 4.69-3.81 8.5-8.5 8.5S3 17.69 3 13s3.81-8.5 8.5-8.5Z" fill="currentColor" />
                  <text x="11.5" y="15.5" textAnchor="middle" fontSize="7.5" fontWeight="bold" fontFamily="system-ui, sans-serif" fill="currentColor">10</text>
                </svg>
              </button>
            </div>

            {/* Center: time + active section info */}
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <span className="inline-flex items-center font-mono text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                {formatSecondsToTime(playerTime)}
                <span className="mx-1 text-zinc-300 dark:text-zinc-600">/</span>
                {formatSecondsToTime(totalDuration)}
              </span>

              {/* Speed selector */}
              <div ref={speedMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
                  className={`cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold tabular-nums transition-all ${
                    playbackSpeed !== 1
                      ? "bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:hover:bg-orange-500/25"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                  }`}
                  title="Playback speed"
                >
                  {playbackSpeed}x
                </button>
                {speedMenuOpen && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => { setPlaybackSpeed(speed); setSpeedMenuOpen(false); }}
                        className={`cursor-pointer flex w-full items-center gap-2 px-4 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
                          playbackSpeed === speed
                            ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                            : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {playbackSpeed === speed && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-orange-500">
                            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                          </svg>
                        )}
                        {playbackSpeed !== speed && <span className="w-3" />}
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

              {displaySection ? (
                <div className="flex items-center gap-2 min-w-0 transition-opacity duration-200" style={{ opacity: activeSection ? 1 : 0.5 }}>
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-[8px] font-bold text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                    {getSpeakerInitials(displaySection.speaker)}
                  </div>
                  <span className="truncate text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {displaySection.speaker ?? "Unknown"}
                  </span>
                  <span className="hidden sm:inline text-[10px] text-zinc-400 dark:text-zinc-500">
                    {formatTimestamp(displaySection.begin_timestamp)} → {formatTimestamp(displaySection.end_timestamp)}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                  {sections.length > 0 ? "No section at this time" : "No audio loaded"}
                </span>
              )}
            </div>

            {/* Right: volume + waveform */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                    <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => { setVolume(Number(e.target.value)); if (isMuted) setIsMuted(false); }}
                className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-orange-500 dark:bg-zinc-700"
                aria-label="Volume"
              />

              {/* Waveform placeholder */}
              <div className="hidden sm:flex items-center gap-[2px] h-6 ml-2">
                {[3, 5, 8, 4, 7, 10, 6, 9, 4, 7, 5, 8, 3, 6, 9, 5, 7, 4, 8, 6].map((h, i) => (
                  <div
                    key={i}
                    className={`w-[2px] rounded-full transition-all duration-300 ${
                      isPlaying && totalDuration > 0 && (i / 20) <= (playerTime / totalDuration)
                        ? "bg-orange-400 dark:bg-orange-500"
                        : "bg-zinc-200 dark:bg-zinc-700"
                    }`}
                    style={{
                      height: `${h * 2.4}px`,
                      animationDelay: isPlaying ? `${i * 80}ms` : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section list ── */}
      <div ref={sectionListRef} className="flex-1 overflow-y-auto px-6 pt-4 pb-6 space-y-2.5">
        {filteredSections.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-zinc-300 dark:text-zinc-600">
              <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">No sections match the current filters.</p>
            <button
              type="button"
              onClick={() => { setFilterSpeaker(""); setFilterTag(""); setSearchQuery(""); }}
              className="mt-1 text-xs font-semibold text-orange-500 hover:text-orange-600 dark:text-orange-400"
            >
              Clear filters
            </button>
          </div>
        )}

        {filteredSections.map((section, idx) => {
          const tags = section.tags;
          const isSectionActive = activeSectionId === section.id;
          const isSaving = savingId === section.id;
          const color = getSpeakerColor(section.speaker);

          // Compute match offsets for this section
          const baseOffset = sectionMatchOffsets.get(section.id) ?? 0;

          return (
            <div key={section.id} className="flex items-center gap-3" data-section-id={section.id}>
              {/* Play button – outside the card */}
              <button
                type="button"
                onClick={() => handlePlay(section)}
                className={`cursor-pointer flex-shrink-0 rounded-full p-2.5 transition-all duration-200 ${
                  isSectionActive && isPlaying
                    ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:brightness-110 active:scale-95"
                    : "bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 hover:brightness-110 active:scale-95"
                }`}
                aria-label={isSectionActive && isPlaying ? "Playing" : "Play from this section"}
              >
                <PlayIcon playing={isSectionActive && isPlaying} />
              </button>

              {/* Card */}
              <div
                className={`group relative flex-1 min-w-0 rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:bg-zinc-900 ${
                  isSectionActive
                    ? "border-orange-300 shadow-orange-100 ring-2 ring-orange-200/70 dark:border-orange-500/50 dark:shadow-orange-500/5 dark:ring-orange-500/20"
                    : "border-zinc-200/80 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                {/* left accent stripe */}
                <div className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${isSectionActive ? "bg-gradient-to-b from-orange-400 to-amber-400" : color.bg}`} />

                {/* saving indicator */}
                {isSaving && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-4 z-10 flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                    Saving…
                  </div>
                )}

                <div className="flex">
                  {/* ── Left: transcript content ── */}
                  <div className="flex-1 min-w-0 p-3.5 pl-5">
                    {/* speaker + timestamps */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ring-2 ${color.bg} ${color.text} ${color.ring}`}>
                          {getSpeakerInitials(section.speaker)}
                        </div>
                        <InlineEdit
                          value={section.speaker ?? ""}
                          onSave={(v) => saveField(section.id, "speaker", v)}
                          onEditStart={pausePlayback}
                          className="text-xs font-semibold text-zinc-900 dark:text-zinc-100"
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
                    </div>

                    {/* transcript text */}
                    <div className="mt-2.5">
                      <InlineEdit
                        value={section.edited_text ?? section.original_text ?? ""}
                        onSave={(v) => saveField(section.id, "edited_text", v)}
                        onEditStart={pausePlayback}
                        multiline
                        className="block w-full rounded-xl text-sm leading-snug"
                        highlight={searchQuery}
                        matchOffset={baseOffset}
                        activeMatchIndex={searchMatchIndex}
                      />
                    </div>
                  </div>

                  {/* ── Right: icon strip with popouts ── */}
                  <div className="relative flex-shrink-0 border-l border-zinc-100 dark:border-zinc-800 flex flex-col items-center gap-1 py-2 px-1.5">

                    {/* Notes icon */}
                    <button
                      type="button"
                      onClick={() => setSidebarPanel(sidebarPanel?.sectionId === section.id && sidebarPanel?.panel === "notes" ? null : { sectionId: section.id, panel: "notes" })}
                      className={`cursor-pointer relative rounded-lg p-2 transition-all ${
                        sidebarPanel?.sectionId === section.id && sidebarPanel?.panel === "notes"
                          ? "bg-sky-100 text-sky-600 ring-2 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-400 dark:ring-sky-500/40"
                          : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      }`}
                      title="Notes"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317 .713 2.435 0 3.277 0 4.26v4.48ZM5 6.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 6.5Zm.75 1.75a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clipRule="evenodd" />
                      </svg>
                      {comments.filter((c) => c.section_id === section.section_id).length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-sky-500 px-1 text-[9px] font-bold text-white">
                          {comments.filter((c) => c.section_id === section.section_id).length}
                        </span>
                      )}
                    </button>

                    {/* Tags icon */}
                    <button
                      type="button"
                      onClick={() => setSidebarPanel(sidebarPanel?.sectionId === section.id && sidebarPanel?.panel === "tags" ? null : { sectionId: section.id, panel: "tags" })}
                      className={`cursor-pointer relative rounded-lg p-2 transition-all ${
                        sidebarPanel?.sectionId === section.id && sidebarPanel?.panel === "tags"
                          ? "bg-orange-100 text-orange-600 ring-2 ring-orange-300 dark:bg-orange-500/20 dark:text-orange-400 dark:ring-orange-500/40"
                          : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      }`}
                      title="Tags"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                      </svg>
                      {tags.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
                          {tags.length}
                        </span>
                      )}
                    </button>

                    {/* Edits icon */}
                    <button
                      type="button"
                      onClick={() => setDiffSectionId(section.id)}
                      className={`cursor-pointer relative rounded-lg p-2 transition-all ${
                        (section.edited_text ?? null) !== null && section.edited_text !== section.original_text
                          ? "text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-500/20"
                          : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      }`}
                      title={(section.edited_text ?? null) !== null && section.edited_text !== section.original_text ? "Show edits" : "Compare"}
                    >
                      {/* Side-by-side diff / compare icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9ZM7.25 3.5H3.5v9h3.75v-9Zm1.5 0v9H12.5v-9H8.75Z" clipRule="evenodd" />
                      </svg>
                      {(section.edited_text ?? null) !== null && section.edited_text !== section.original_text && (
                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900" />
                      )}
                    </button>

                    {/* ── Notes popout ── */}
                    {sidebarPanel?.sectionId === section.id && sidebarPanel?.panel === "notes" && (
                      <div className="absolute right-full top-0 z-40 mr-2 w-80 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                          <div className="flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-sky-500">
                              <path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317 .713 2.435 0 3.277 0 4.26v4.48ZM5 6.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 6.5Zm.75 1.75a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Notes</span>
                            <span className="text-[10px] text-zinc-400">({comments.filter((c) => c.section_id === section.section_id).length})</span>
                          </div>
                          <button type="button" onClick={() => setSidebarPanel(null)} className="cursor-pointer rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300" aria-label="Close">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                          </button>
                        </div>
                        <div className="max-h-[220px] overflow-y-auto">
                          {(() => {
                            const sectionNotes = comments.filter((c) => c.section_id === section.section_id);
                            if (sectionNotes.length === 0) {
                              return (
                                <div className="flex flex-col items-center justify-center gap-1 py-6">
                                  <p className="text-xs font-medium text-zinc-400">No notes yet</p>
                                  <p className="text-[10px] text-zinc-300 dark:text-zinc-600">Add one below.</p>
                                </div>
                              );
                            }
                            return (
                              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {sectionNotes.map((c) => (
                                  <div key={c.id} className="px-4 py-2.5">
                                    <p className="text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">{c.comment}</p>
                                    <p className="mt-0.5 text-[10px] text-zinc-300 dark:text-zinc-600">{c.created_at ? new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="border-t border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
                          <InlineCommentInput
                            transcriptId={transcriptId}
                            sectionId={section.section_id}
                            onCommentAdded={() => fetchComments(true)}
                          />
                        </div>
                      </div>
                    )}

                    {/* ── Tags popout ── */}
                    {sidebarPanel?.sectionId === section.id && sidebarPanel?.panel === "tags" && (
                      <div className="absolute right-full top-0 z-40 mr-2 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                          <div className="flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-orange-500">
                              <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tags</span>
                          </div>
                          <button type="button" onClick={() => setSidebarPanel(null)} className="cursor-pointer rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300" aria-label="Close">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                          </button>
                        </div>
                        <div className="p-4">
                          <TagEditor
                            tags={tags}
                            onAdd={(tag) => handleAddTag(section.id, tags, tag)}
                            onRemove={(tag) => handleRemoveTag(section.id, tags, tag)}
                          />
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Spacer so the last sections can still scroll to the top when active */}
        {filteredSections.length > 0 && <div className="h-[60vh]" aria-hidden="true" />}
      </div>

      {/* ── Diff modal ── */}
      {diffSectionId !== null && (() => {
        const sec = sections.find((s) => s.id === diffSectionId);
        if (!sec) return null;
        return <DiffModal section={sec} onClose={() => setDiffSectionId(null)} onSave={(v) => saveField(sec.id, "edited_text", v)} />;
      })()}
    </section>
  );
}
