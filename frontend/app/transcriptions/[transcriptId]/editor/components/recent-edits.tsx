"use client";

import { useState, useMemo } from "react";
import type { RecentEdit } from "../lib/types";
import { relativeTime, formatTimestamp } from "../lib/helpers";

/* ── Component ── */

type RecentEditsProps = {
  edits: RecentEdit[];
  loading: boolean;
  onJumpToSection: (sectionDbId: number) => void;
  onRefresh: () => void;
  onClose: () => void;
};

export default function RecentEdits({
  edits,
  loading,
  onJumpToSection,
  onRefresh,
  onClose,
}: RecentEditsProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const mostRecent = edits[0] ?? null;

  /* Group edits by "today" / "earlier" */
  const { today, earlier } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEdits: RecentEdit[] = [];
    const earlierEdits: RecentEdit[] = [];
    for (const e of edits) {
      const t = e.created_at ? new Date(e.created_at).getTime() : 0;
      if (t >= todayStart) todayEdits.push(e);
      else earlierEdits.push(e);
    }
    return { today: todayEdits, earlier: earlierEdits };
  }, [edits]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-white">
              <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Recent Edits</h3>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {edits.length} edited section{edits.length !== 1 ? "s" : ""} · pick up where you left off
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRefresh}
            className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Refresh"
            title="Refresh recent edits"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}>
              <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.681.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-.908l.84.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44.908l-.84-.84v1.836a.75.75 0 0 1-1.5 0V9.722a.75.75 0 0 1 .75-.75h3.182a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.681.75.75 0 0 1 1.025-.274Z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Jump to most recent ── */}
      {mostRecent && mostRecent.section_db_id && (
        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => onJumpToSection(mostRecent.section_db_id!)}
            className="cursor-pointer flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-3.5 py-3 text-left ring-1 ring-amber-200/80 transition-all hover:shadow-md hover:ring-amber-300 dark:from-amber-500/10 dark:to-orange-500/10 dark:ring-amber-500/30 dark:hover:ring-amber-500/50"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4.5 w-4.5 text-white">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM6.75 9.25a.75.75 0 0 0 0 1.5h4.59l-2.1 1.95a.75.75 0 0 0 1.02 1.1l3.5-3.25a.75.75 0 0 0 0-1.1l-3.5-3.25a.75.75 0 1 0-1.02 1.1l2.1 1.95H6.75Z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Jump to most recent edit
              </p>
              <p className="mt-0.5 text-[10px] text-amber-600/80 dark:text-amber-400/70 truncate">
                Section §{mostRecent.section_id}
                {mostRecent.section_speaker && ` · ${mostRecent.section_speaker}`}
                {mostRecent.section_begin_timestamp && ` · ${formatTimestamp(mostRecent.section_begin_timestamp)}`}
                {" · "}
                {relativeTime(mostRecent.created_at)}
              </p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 flex-shrink-0 text-amber-400 dark:text-amber-500">
              <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && edits.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-[11px] text-zinc-400">Loading recent edits…</p>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && edits.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 px-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-zinc-200 dark:text-zinc-700">
            <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
            <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
          </svg>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
            No edits yet — start editing sections and they&apos;ll appear here
          </p>
        </div>
      )}

      {/* ── Edits list ── */}
      {edits.length > 0 && (
        <div className="max-h-72 overflow-y-auto">
          {/* Today */}
          {today.length > 0 && (
            <div>
              <div className="sticky top-0 z-10 bg-white/90 px-4 pt-2.5 pb-1 backdrop-blur-sm dark:bg-zinc-900/90">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Today ({today.length})
                </span>
              </div>
              <div className="space-y-0.5 px-2 pb-2">
                {today.map((edit) => (
                  <EditRow
                    key={edit.id}
                    edit={edit}
                    isHovered={hoveredId === edit.id}
                    onHover={() => setHoveredId(edit.id)}
                    onLeave={() => setHoveredId(null)}
                    onJump={() => edit.section_db_id && onJumpToSection(edit.section_db_id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Earlier */}
          {earlier.length > 0 && (
            <div>
              <div className="sticky top-0 z-10 bg-white/90 px-4 pt-2.5 pb-1 backdrop-blur-sm dark:bg-zinc-900/90">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Earlier ({earlier.length})
                </span>
              </div>
              <div className="space-y-0.5 px-2 pb-2">
                {earlier.map((edit) => (
                  <EditRow
                    key={edit.id}
                    edit={edit}
                    isHovered={hoveredId === edit.id}
                    onHover={() => setHoveredId(edit.id)}
                    onLeave={() => setHoveredId(null)}
                    onJump={() => edit.section_db_id && onJumpToSection(edit.section_db_id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Individual edit row ── */

function EditRow({
  edit,
  isHovered,
  onHover,
  onLeave,
  onJump,
}: {
  edit: RecentEdit;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onJump: () => void;
}) {
  const hasSection = edit.section_db_id != null;
  return (
    <button
      type="button"
      disabled={!hasSection}
      onClick={onJump}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`cursor-pointer flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all ${
        isHovered
          ? "bg-amber-50/80 ring-1 ring-amber-200/60 dark:bg-amber-500/10 dark:ring-amber-500/20"
          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      } ${!hasSection ? "opacity-50 cursor-default" : ""}`}
    >
      {/* Section badge */}
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200/60 mt-0.5 dark:from-amber-500/20 dark:to-orange-500/20 dark:text-amber-400 dark:ring-amber-500/30">
        §{edit.section_id ?? "?"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {edit.section_speaker && (
            <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]">
              {edit.section_speaker}
            </span>
          )}
          {edit.section_begin_timestamp && (
            <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
              {formatTimestamp(edit.section_begin_timestamp)}
            </span>
          )}
        </div>
        {edit.text_preview && (
          <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-2">
            {edit.text_preview}
          </p>
        )}
        <p className="mt-0.5 text-[9px] text-zinc-400 dark:text-zinc-500">
          {relativeTime(edit.created_at)}
        </p>
      </div>

      {/* Jump arrow */}
      {hasSection && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={`h-3.5 w-3.5 flex-shrink-0 mt-1 transition-colors ${
            isHovered ? "text-amber-500 dark:text-amber-400" : "text-zinc-300 dark:text-zinc-600"
          }`}
        >
          <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}
