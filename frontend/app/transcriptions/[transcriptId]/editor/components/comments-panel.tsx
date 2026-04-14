"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { TranscriptComment } from "../lib/types";
import { getCommenterColor, relativeTime } from "../lib/helpers";
import InlineCommentInput from "./inline-comment-input";

/* ── Helpers ── */

/** Highlight every occurrence of `query` inside `text` with a yellow mark. */
function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-amber-200/80 text-amber-900 rounded-sm px-0.5 dark:bg-amber-500/30 dark:text-amber-200">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

const COMMENTER_COLORS_PANEL = [
  { bg: "bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-500/20 dark:to-amber-500/20", text: "text-orange-700 dark:text-orange-300", ring: "ring-orange-200/60 dark:ring-orange-500/30" },
  { bg: "bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-500/20 dark:to-indigo-500/20", text: "text-sky-700 dark:text-sky-300", ring: "ring-sky-200/60 dark:ring-sky-500/30" },
  { bg: "bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-500/20 dark:to-purple-500/20", text: "text-violet-700 dark:text-violet-300", ring: "ring-violet-200/60 dark:ring-violet-500/30" },
  { bg: "bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-500/20 dark:to-teal-500/20", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-200/60 dark:ring-emerald-500/30" },
  { bg: "bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-500/20 dark:to-pink-500/20", text: "text-rose-700 dark:text-rose-300", ring: "ring-rose-200/60 dark:ring-rose-500/30" },
];

/* ── Component ── */

type CommentsPanelProps = {
  transcriptId: string;
  comments: TranscriptComment[];
  sections: { id: number; section_id: number; speaker: string | null }[];
  activeSectionId: number | null;
  loading: boolean;
  onSectionSelect: (sectionId: number | null) => void;
  onCommentAdded: () => void;
  onJumpToSection?: (sectionDbId: number) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

export default function CommentsPanel({
  transcriptId,
  comments,
  sections,
  activeSectionId,
  loading,
  onSectionSelect,
  onCommentAdded,
  onJumpToSection,
  collapsed,
  onCollapsedChange,
}: CommentsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");

  /* unique commenters */
  const commenters = useMemo(() => {
    const ids = comments.map((c) => c.created_by).filter((id) => id != null) as number[];
    return Array.from(new Set(ids));
  }, [comments]);

  /* comments grouped by section_id */
  const groupedComments = useMemo(() => {
    const map = new Map<number, TranscriptComment[]>();
    for (const c of comments) {
      if (c.section_id == null) continue;
      const list = map.get(c.section_id) ?? [];
      list.push(c);
      map.set(c.section_id, list);
    }
    return map;
  }, [comments]);

  /* filter comments by search query */
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredGroupedComments = useMemo(() => {
    if (!normalizedQuery) return groupedComments;
    const map = new Map<number, TranscriptComment[]>();
    for (const [sectionId, sectionComments] of groupedComments) {
      const matched = sectionComments.filter(
        (c) => c.comment?.toLowerCase().includes(normalizedQuery)
      );
      if (matched.length > 0) map.set(sectionId, matched);
    }
    return map;
  }, [groupedComments, normalizedQuery]);

  const filteredCommentCount = useMemo(() => {
    let count = 0;
    for (const list of filteredGroupedComments.values()) count += list.length;
    return count;
  }, [filteredGroupedComments]);

  /* sections that have comments OR are currently active, sorted by section_id */
  const commentedSections = useMemo(() => {
    return sections
      .filter((s) => filteredGroupedComments.has(s.section_id) || (!normalizedQuery && s.id === activeSectionId))
      .sort((a, b) => a.section_id - b.section_id);
  }, [sections, filteredGroupedComments, activeSectionId, normalizedQuery]);

  /* scroll to active section when it changes */
  useEffect(() => {
    if (activeSectionId == null) return;
    const el = sectionRefs.current.get(activeSectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeSectionId]);

  /* ── Collapsed strip ── */
  if (collapsed) {
    return (
      <div className="w-11 flex-shrink-0 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex flex-col items-center py-3 gap-3">
        <button
          type="button"
          onClick={() => onCollapsedChange(false)}
          title="Expand comments"
          className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 shadow-sm transition hover:shadow-md hover:scale-105 relative"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-white">
            <path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317 .713 2.435 0 3.277 0 4.26v4.48Z" clipRule="evenodd" />
          </svg>
          {comments.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sky-500 px-1 text-[8px] font-bold text-white shadow">
              {comments.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="border-b border-zinc-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => onCollapsedChange(true)}
          className="cursor-pointer flex w-full items-center gap-2.5 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          title="Collapse comments"
        >
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-white">
              <path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317 .713 2.435 0 3.277 0 4.26v4.48Z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Comments</h3>
        </button>

        {/* ── Search bar ── */}
        <div className="relative mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400 dark:text-zinc-500 pointer-events-none">
            <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search comments…"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-7 pr-7 text-[11px] text-zinc-700 placeholder:text-zinc-400 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-1 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:placeholder:text-zinc-500 dark:focus:border-sky-600 dark:focus:ring-sky-500/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Comments Feed ── */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>

        {/* Loading state */}
        {loading && comments.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            <p className="text-[11px] text-zinc-400">Loading comments…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && commentedSections.length === 0 && !normalizedQuery && (
          <div className="flex flex-col items-center gap-2 py-8 px-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-zinc-200 dark:text-zinc-700">
              <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52a1.595 1.595 0 0 1 1.348 1.58v7.95c0 .713-.471 1.345-1.152 1.546a48.34 48.34 0 0 0-2.398.757 16.906 16.906 0 0 0-.09.04l-.003.002H16.85l-.004.001a3.482 3.482 0 0 0-.135.071 14.205 14.205 0 0 0-1.534 1.016c-.88.69-1.927 1.716-2.302 3.186a2.27 2.27 0 0 1-.385.82c-.062.072-.169.165-.326.166h-.008c-.157-.001-.264-.094-.326-.166a2.27 2.27 0 0 1-.385-.82c-.375-1.47-1.422-2.497-2.302-3.186a14.205 14.205 0 0 0-1.534-1.016 3.482 3.482 0 0 0-.135-.07l-.004-.002h-.001l-.003-.002a16.906 16.906 0 0 0-.09-.04 48.34 48.34 0 0 0-2.398-.757A1.594 1.594 0 0 1 3.5 12.3V4.35c0-.78.56-1.447 1.348-1.58Z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">Click the comment icon on a section to start a thread</p>
          </div>
        )}

        {/* No search results */}
        {!loading && commentedSections.length === 0 && normalizedQuery && (
          <div className="flex flex-col items-center gap-2 py-8 px-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7 text-zinc-200 dark:text-zinc-700">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">No comments matching &ldquo;{searchQuery.trim()}&rdquo;</p>
          </div>
        )}

        {/* Section groups */}
        <div className="space-y-1 px-2 pb-2">
          {commentedSections.map((sec) => {
            const sectionComments = filteredGroupedComments.get(sec.section_id) ?? [];
            const isActive = activeSectionId === sec.id || (!!normalizedQuery && sectionComments.length > 0);

            return (
              <div
                key={sec.id}
                ref={(el) => { sectionRefs.current.set(sec.id, el); }}
                className="rounded-xl overflow-hidden"
              >
                {/* Section header button */}
                <button
                  type="button"
                  onClick={() => {
                    onSectionSelect(isActive && !normalizedQuery ? null : sec.id);
                    if (onJumpToSection) onJumpToSection(sec.id);
                  }}
                  className={`cursor-pointer flex w-full items-center gap-2 px-2.5 py-2 text-left transition-all rounded-xl ${
                    isActive
                      ? "bg-sky-50 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:ring-sky-500/30"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[9px] font-bold ${isActive ? "bg-sky-500 text-white" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                    §{sec.section_id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                      Section {sec.section_id}
                    </p>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500">
                      {sectionComments.length} comment{sectionComments.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {onJumpToSection && (
                    <span
                      role="button"
                      tabIndex={0}
                      title="Go to section"
                      onClick={(e) => { e.stopPropagation(); onJumpToSection(sec.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onJumpToSection(sec.id); } }}
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-sky-100 hover:text-sky-600 dark:hover:bg-sky-500/20 dark:hover:text-sky-400"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                        <path fillRule="evenodd" d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`h-3 w-3 text-zinc-400 transition-transform ${isActive ? "rotate-180" : ""}`}>
                    <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Expanded comments for this section */}
                {isActive && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    {sectionComments.map((c) => {
                      const cColor = getCommenterColor(c.created_by);
                      return (
                        <div
                          key={c.id}
                          onClick={() => onJumpToSection?.(sec.id)}
                          className="flex items-start gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                        >
                          <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[8px] font-bold ring-1 mt-0.5 ${cColor.bg} ${cColor.text} ${cColor.ring}`}>
                            U{c.created_by ?? "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                                User {c.created_by ?? "?"}
                              </span>
                              <span className="text-[9px] text-zinc-400 dark:text-zinc-500">{relativeTime(c.created_at)}</span>
                            </div>
                            <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                              {normalizedQuery && c.comment
                                ? highlightMatch(c.comment, normalizedQuery)
                                : (c.comment ?? "")}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {/* Reply input for this section */}
                    <div className="px-2 py-2">
                      <InlineCommentInput
                        transcriptId={transcriptId}
                        sectionId={sec.section_id}
                        onCommentAdded={onCommentAdded}
                        autoFocus={sectionComments.length === 0}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
