"use client";

import { useState, useMemo } from "react";
import type { ActivityLogEntry, RecentEdit } from "../lib/types";
import { relativeTime as _relativeTime, formatTimestamp } from "../lib/helpers";

/* ── Action metadata ── */

const ACTION_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  section_edited: {
    label: "Edited",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-500/30",
  },
  comment_added: {
    label: "Commented",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-500/30",
  },
  tags_updated: {
    label: "Tagged",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-500/30",
  },
  section_added: {
    label: "Added",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-500/30",
  },
  section_deleted: {
    label: "Deleted",
    bg: "bg-red-50 dark:bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-500/30",
  },
  speaker_renamed: {
    label: "Speaker",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-500/30",
  },
};

const DEFAULT_ACTION = {
  label: "Activity",
  bg: "bg-zinc-50 dark:bg-zinc-500/10",
  text: "text-zinc-700 dark:text-zinc-400",
  border: "border-zinc-200 dark:border-zinc-500/30",
};

/* ── Helpers ── */

function relativeTime(dateStr: string | null): string {
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

const EDITOR_COLORS = [
  { bg: "bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-500/20 dark:to-amber-500/20", text: "text-orange-700 dark:text-orange-300", ring: "ring-orange-200/60 dark:ring-orange-500/30" },
  { bg: "bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-500/20 dark:to-indigo-500/20", text: "text-sky-700 dark:text-sky-300", ring: "ring-sky-200/60 dark:ring-sky-500/30" },
  { bg: "bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-500/20 dark:to-purple-500/20", text: "text-violet-700 dark:text-violet-300", ring: "ring-violet-200/60 dark:ring-violet-500/30" },
  { bg: "bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-500/20 dark:to-teal-500/20", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-200/60 dark:ring-emerald-500/30" },
  { bg: "bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-500/20 dark:to-pink-500/20", text: "text-rose-700 dark:text-rose-300", ring: "ring-rose-200/60 dark:ring-rose-500/30" },
];

function getEditorColor(name: string, editors: string[]) {
  const idx = editors.indexOf(name);
  return EDITOR_COLORS[(idx >= 0 ? idx : 0) % EDITOR_COLORS.length];
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/[\s_-]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ── Component ── */

type Tab = "recent-edits" | "activity";

type EditorActivityProps = {
  activityLog: ActivityLogEntry[];
  loading: boolean;
  recentEdits: RecentEdit[];
  loadingRecentEdits: boolean;
  onJumpToSection: (sectionDbId: number) => void;
  onRefresh: () => void;
  onRefreshRecentEdits: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

export default function EditorActivity({ activityLog, loading, recentEdits, loadingRecentEdits, onJumpToSection, onRefresh, onRefreshRecentEdits, collapsed, onCollapsedChange }: EditorActivityProps) {
  const [activeTab, setActiveTab] = useState<Tab>("recent-edits");
  const [filterEditor, setFilterEditor] = useState<string>("");
  const [hoveredEditId, setHoveredEditId] = useState<number | null>(null);

  /* unique editor names */
  const editors = useMemo(() => {
    const names = activityLog.map((a) => a.user_display_name).filter(Boolean) as string[];
    return Array.from(new Set(names));
  }, [activityLog]);

  /* per-editor stats */
  const editorStats = useMemo(() => {
    return editors
      .map((name) => {
        const entries = activityLog.filter((a) => a.user_display_name === name);
        const sorted = [...entries].sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });
        return {
          name,
          count: entries.length,
          lastActive: sorted[0]?.created_at ?? null,
          actions: Array.from(new Set(entries.map((e) => e.action))),
        };
      })
      .sort((a, b) => {
        const ta = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const tb = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        return tb - ta;
      });
  }, [activityLog, editors]);

  /* filtered activity list */
  const filteredLog = useMemo(() => {
    if (!filterEditor) return activityLog;
    return activityLog.filter((a) => a.user_display_name === filterEditor);
  }, [activityLog, filterEditor]);

  /* ── Collapsed strip ── */
  if (collapsed) {
    return (
      <div className="w-11 flex-shrink-0 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex flex-col items-center py-3 gap-3">
        <button
          type="button"
          onClick={() => onCollapsedChange(false)}
          title="Expand activity"
          className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-indigo-500 shadow-sm transition hover:shadow-md hover:scale-105 relative"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-white">
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
          </svg>
          {activityLog.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-500 px-1 text-[8px] font-bold text-white shadow">
              {activityLog.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center border-b border-zinc-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => onCollapsedChange(true)}
          className="cursor-pointer flex flex-1 items-center gap-2.5 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          title="Collapse activity"
        >
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-indigo-500 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-white">
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Activity</h3>
        </button>
        <button
          type="button"
          onClick={activeTab === "recent-edits" ? onRefreshRecentEdits : onRefresh}
          className="cursor-pointer rounded-lg p-1.5 mr-3 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Refresh"
          title="Refresh"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`h-3.5 w-3.5 ${(activeTab === "recent-edits" ? loadingRecentEdits : loading) ? "animate-spin" : ""}`}>
            <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.681.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-.908l.84.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44.908l-.84-.84v1.836a.75.75 0 0 1-1.5 0V9.722a.75.75 0 0 1 .75-.75h3.182a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.681.75.75 0 0 1 1.025-.274Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800">
        <button type="button" onClick={() => setActiveTab("recent-edits")} className={`cursor-pointer flex-1 px-3 py-2.5 text-[11px] font-semibold transition-colors relative ${activeTab === "recent-edits" ? "text-amber-600 dark:text-amber-400" : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"}`}>
          <div className="flex items-center justify-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" /></svg>
            My Edits
            {recentEdits.length > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${activeTab === "recent-edits" ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>{recentEdits.length}</span>}
          </div>
          {activeTab === "recent-edits" && <div className="absolute bottom-0 inset-x-3 h-0.5 rounded-full bg-amber-500 dark:bg-amber-400" />}
        </button>
        <button type="button" onClick={() => setActiveTab("activity")} className={`cursor-pointer flex-1 px-3 py-2.5 text-[11px] font-semibold transition-colors relative ${activeTab === "activity" ? "text-violet-600 dark:text-violet-400" : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"}`}>
          <div className="flex items-center justify-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" /></svg>
            All Activity
          </div>
          {activeTab === "activity" && <div className="absolute bottom-0 inset-x-3 h-0.5 rounded-full bg-violet-500 dark:bg-violet-400" />}
        </button>
      </div>

      {/* ── Recent Edits tab content ── */}
      {activeTab === "recent-edits" && (() => {
        const mostRecent = recentEdits[0] ?? null;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEdits = recentEdits.filter((e) => (e.created_at ? new Date(e.created_at).getTime() : 0) >= todayStart);
        const earlierEdits = recentEdits.filter((e) => (e.created_at ? new Date(e.created_at).getTime() : 0) < todayStart);

        return (
          <div className="flex-1 overflow-y-auto">
            {/* Jump to most recent */}
            {mostRecent && mostRecent.section_db_id && (
              <div className="border-b border-zinc-100 px-3 py-3 dark:border-zinc-800">
                <button type="button" onClick={() => onJumpToSection(mostRecent.section_db_id!)} className="cursor-pointer flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2.5 text-left ring-1 ring-amber-200/80 transition-all hover:shadow-md hover:ring-amber-300 dark:from-amber-500/10 dark:to-orange-500/10 dark:ring-amber-500/30 dark:hover:ring-amber-500/50">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-white"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM6.75 9.25a.75.75 0 0 0 0 1.5h4.59l-2.1 1.95a.75.75 0 0 0 1.02 1.1l3.5-3.25a.75.75 0 0 0 0-1.1l-3.5-3.25a.75.75 0 1 0-1.02 1.1l2.1 1.95H6.75Z" clipRule="evenodd" /></svg>
                  </div>
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Jump to most recent edit</p>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 flex-shrink-0 text-amber-400 dark:text-amber-500"><path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" /></svg>
                </button>
              </div>
            )}
            {/* Loading */}
            {loadingRecentEdits && recentEdits.length === 0 && <div className="flex flex-col items-center gap-2 py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" /><p className="text-[11px] text-zinc-400">Loading recent edits…</p></div>}
            {/* Empty */}
            {!loadingRecentEdits && recentEdits.length === 0 && <div className="flex flex-col items-center gap-2 py-8 px-4"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-zinc-200 dark:text-zinc-700"><path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" /><path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" /></svg><p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">No edits yet — start editing and they&apos;ll appear here</p></div>}
            {/* Edits list */}
            {recentEdits.length > 0 && (<div>
              {[{ label: "Today", items: todayEdits }, { label: "Earlier", items: earlierEdits }].filter((g) => g.items.length > 0).map((group) => (
                <div key={group.label}>
                  <div className="sticky top-0 z-10 bg-white/90 px-3 pt-2.5 pb-1 backdrop-blur-sm dark:bg-zinc-900/90"><span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{group.label} ({group.items.length})</span></div>
                  <div className="space-y-0.5 px-2 pb-2">
                    {group.items.map((edit) => (
                      <button key={edit.id} type="button" disabled={edit.section_db_id == null} onClick={() => edit.section_db_id && onJumpToSection(edit.section_db_id)} onMouseEnter={() => setHoveredEditId(edit.id)} onMouseLeave={() => setHoveredEditId(null)} className={`cursor-pointer flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all ${hoveredEditId === edit.id ? "bg-amber-50/80 ring-1 ring-amber-200/60 dark:bg-amber-500/10 dark:ring-amber-500/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"} ${edit.section_db_id == null ? "opacity-50 cursor-default" : ""}`}>
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200/60 mt-0.5 dark:from-amber-500/20 dark:to-orange-500/20 dark:text-amber-400 dark:ring-amber-500/30">§{edit.section_id ?? "?"}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {edit.section_speaker && <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]">{edit.section_speaker}</span>}
                            {edit.section_begin_timestamp && <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">{formatTimestamp(edit.section_begin_timestamp)}</span>}
                          </div>
                          {edit.text_preview && <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-2">{edit.text_preview}</p>}
                          <p className="mt-0.5 text-[9px] text-zinc-400 dark:text-zinc-500">{_relativeTime(edit.created_at)}</p>
                        </div>
                        {edit.section_db_id != null && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`h-3.5 w-3.5 flex-shrink-0 mt-1 transition-colors ${hoveredEditId === edit.id ? "text-amber-500 dark:text-amber-400" : "text-zinc-300 dark:text-zinc-600"}`}><path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" /></svg>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>)}
          </div>
        );
      })()}

      {/* ── Editors Summary (All Activity tab) ── */}
      {activeTab === "activity" && <div className="border-b border-zinc-100 p-3 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Editors</span>
        </div>

        {editors.length === 0 && !loading && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic py-2">No editor activity yet</p>
        )}

        <div className="space-y-1.5">
          {editorStats.map((editor) => {
            const isActive = filterEditor === editor.name;
            const color = getEditorColor(editor.name, editors);
            return (
              <button
                key={editor.name}
                type="button"
                onClick={() => setFilterEditor(isActive ? "" : editor.name)}
                className={`cursor-pointer flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all ${
                  isActive
                    ? "bg-violet-50 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:ring-violet-500/30"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1 ${color.bg} ${color.text} ${color.ring}`}>
                  {getInitials(editor.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{editor.name}</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {editor.count} edit{editor.count !== 1 ? "s" : ""} · {relativeTime(editor.lastActive)}
                  </p>
                </div>
                {isActive && (
                  <span className="flex-shrink-0 rounded-full bg-violet-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>}

      {/* ── Filter indicator ── */}
      {activeTab === "activity" && filterEditor && (
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2 dark:border-zinc-800">
          <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Filtering by:</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
            {filterEditor}
            <button
              type="button"
              onClick={() => setFilterEditor("")}
              className="cursor-pointer ml-0.5 rounded-full hover:bg-violet-200 dark:hover:bg-violet-500/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
              </svg>
            </button>
          </span>
        </div>
      )}

      {/* ── Activity Feed ── */}
      {activeTab === "activity" && <div className="flex-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Recent Activity {filterEditor && `(${filteredLog.length})`}
          </span>
        </div>

        {/* Loading state */}
        {loading && activityLog.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
            <p className="text-[11px] text-zinc-400">Loading activity…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredLog.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 px-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-zinc-200 dark:text-zinc-700">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
              {filterEditor ? `No activity from ${filterEditor}` : "No activity recorded yet"}
            </p>
          </div>
        )}

        {/* Activity entries */}
        <div className="space-y-0.5 px-2 pb-4">
          {filteredLog.map((entry) => {
            const config = ACTION_CONFIG[entry.action] ?? DEFAULT_ACTION;
            const editorColor = entry.user_display_name
              ? getEditorColor(entry.user_display_name, editors)
              : EDITOR_COLORS[0];
            const canNavigate = entry.section_db_id != null;

            return (
              <button
                key={entry.id}
                type="button"
                disabled={!canNavigate}
                onClick={() => canNavigate && onJumpToSection(entry.section_db_id!)}
                className={`group flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left transition-all ${
                  canNavigate
                    ? "cursor-pointer hover:bg-violet-50/80 hover:ring-1 hover:ring-violet-200/60 dark:hover:bg-violet-500/10 dark:hover:ring-violet-500/20"
                    : "cursor-default opacity-60"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[8px] font-bold ring-1 mt-0.5 ${editorColor.bg} ${editorColor.text} ${editorColor.ring}`}
                >
                  {getInitials(entry.user_display_name)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      {entry.user_display_name ?? "Unknown"}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${config.bg} ${config.text} ${config.border}`}
                    >
                      {config.label}
                    </span>
                    {entry.section_id != null && (
                      <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500">§{entry.section_id}</span>
                    )}
                  </div>
                  {entry.summary && (
                    <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {entry.summary}
                    </p>
                  )}
                  <p className="mt-0.5 text-[9px] text-zinc-400 dark:text-zinc-500">{relativeTime(entry.created_at)}</p>
                </div>

                {/* Navigate arrow */}
                {canNavigate && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 flex-shrink-0 mt-1 text-zinc-300 transition-colors group-hover:text-violet-500 dark:text-zinc-600 dark:group-hover:text-violet-400">
                    <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>}
    </div>
  );
}
