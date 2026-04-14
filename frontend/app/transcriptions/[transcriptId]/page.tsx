"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MentionTextarea from "./editor/components/mention-textarea";
import MentionText from "@/app/components/mention-text";

/* ── Types ── */

interface OverviewSpeaker {
  id: number;
  display_name: string | null;
  speaker_label: string | null;
  section_count: number;
}

interface ActivityEntry {
  id: number;
  action: string;
  section_id: number | null;
  summary: string | null;
  user_display_name: string | null;
  created_at: string | null;
}

interface RecentComment {
  id: number;
  section_id: number;
  comment: string;
  user_display_name: string | null;
  created_at: string | null;
}

interface TodoItem {
  id: number;
  transcription_id: number;
  title: string;
  is_completed: number;
  sort_order: number;
  created_by: number | null;
  created_at: string | null;
  completed_at: string | null;
}

interface TranscriptOverview {
  id: number;
  title: string | null;
  description: string | null;
  status: string | null;
  lesson_subject: string | null;
  lesson_number: string | null;
  tags: string[];
  created: string | null;
  modified: string | null;
  total_sections: number;
  edited_sections: number;
  total_speakers: number;
  total_comments: number;
  total_duration: string | null;
  speakers: OverviewSpeaker[];
  recent_activity: ActivityEntry[];
  recent_comments: RecentComment[];
}

interface ThreadItem {
  id: number;
  transcription_id: number;
  title: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string | null;
  post_count: number;
  latest_post_at: string | null;
}

interface PostItem {
  id: number;
  thread_id: number;
  parent_post_id: number | null;
  body: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string | null;
  edited_at: string | null;
}

interface PostSearchHit {
  id: number;
  thread_id: number;
  thread_title: string;
  body: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string | null;
}

/* ── Helpers ── */

function getSpeakerInitials(speaker: string | null) {
  if (!speaker) return "?";
  return speaker.split(/[\s_-]+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  section_edited: { label: "Edited section", color: "text-amber-600 dark:text-amber-400" },
  section_added: { label: "Added section", color: "text-emerald-600 dark:text-emerald-400" },
  section_deleted: { label: "Deleted section", color: "text-red-500 dark:text-red-400" },
  comment_added: { label: "Added comment", color: "text-sky-600 dark:text-sky-400" },
};

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  // Backend stores naive UTC timestamps – append 'Z' so JS treats them as UTC
  const utcStr = /[Z+-]\d{0,4}$/.test(dateStr) ? dateStr : dateStr + "Z";
  const diff = Date.now() - new Date(utcStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ================================================================== */
/*  Todo List component                                                */
/* ================================================================== */

function TodoList({ transcriptId, onActivityChange }: { transcriptId: string; onActivityChange?: () => void }) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/todos`);
      if (!res.ok) return;
      setTodos(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [transcriptId]);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);
  useEffect(() => { if (editingId && editRef.current) editRef.current.focus(); }, [editingId]);

  const addTodo = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        setTodos(await res.json());
        setNewTitle("");
        inputRef.current?.focus();
        onActivityChange?.();
      }
    } catch { /* ignore */ } finally { setAdding(false); }
  };

  const toggleTodo = async (todo: TodoItem) => {
    const next = todo.is_completed === 1 ? 0 : 1;
    setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, is_completed: next } : t));
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/todos/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: next }),
      });
      if (res.ok) {
        setTodos(await res.json());
        onActivityChange?.();
      }
    } catch { fetchTodos(); }
  };

  const saveEdit = async (todoId: number) => {
    if (!editingTitle.trim()) { setEditingId(null); return; }
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/todos/${todoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingTitle.trim() }),
      });
      if (res.ok) setTodos(await res.json());
    } catch { /* ignore */ } finally { setEditingId(null); }
  };

  const deleteTodo = async (todoId: number) => {
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/todos/${todoId}`, { method: "DELETE" });
      if (res.ok) {
        setTodos(await res.json());
        onActivityChange?.();
      }
    } catch { fetchTodos(); }
  };

  const openCount = todos.filter((t) => t.is_completed === 0).length;
  const doneCount = todos.filter((t) => t.is_completed === 1).length;
  const progress = todos.length > 0 ? Math.round((doneCount / todos.length) * 100) : 0;

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-indigo-500">
              <path fillRule="evenodd" d="M11.986 3H12a2 2 0 0 1 2 2v6a2 2 0 0 1-1.5 1.937V7A2.5 2.5 0 0 0 10 4.5H4.063A2 2 0 0 1 6 3h.014A2.25 2.25 0 0 1 8.25 1h-.5a2.25 2.25 0 0 1 2.236 2ZM10.5 4v-.75a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0-.75.75V4h5Z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M2 7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7Zm6.585 1.08a.75.75 0 0 1 .336 1.005l-1.75 3.5a.75.75 0 0 1-1.16.234l-1.25-1.25a.75.75 0 0 1 1.06-1.06l.557.556 1.202-2.649a.75.75 0 0 1 1.005-.337Z" clipRule="evenodd" />
            </svg>
            To-Do
          </h2>
          <div className="flex items-center gap-2">
            {todos.length > 0 && (
              <>
                <span className="text-[10px] font-semibold tabular-nums text-zinc-400">
                  {doneCount}/{todos.length}
                </span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            )}
            {doneCount > 0 && (
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
              >
                {showCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M2.28 2.22a.75.75 0 0 0-1.06 1.06l5.72 5.72-1.72 1.72a.75.75 0 0 0 1.06 1.06l1.72-1.72 4.72 4.72a.75.75 0 1 0 1.06-1.06l-11.5-11.5Z" /><path d="M6.233 4.112a6.538 6.538 0 0 1 1.77-.248c2.296 0 4.076 1.16 5.213 2.398a10.46 10.46 0 0 1 1.206 1.59c.058.096.1.17.128.223l.022.04-.022.04a8.15 8.15 0 0 1-.506.745l1.06 1.06A9.413 9.413 0 0 0 15.9 8.6l.1-.2a.75.75 0 0 0 0-.8C15.382 6.378 13.12 3.364 8.003 3.364c-.9 0-1.73.134-2.49.38l.72.368ZM9.742 11.872l-1.06-1.06A6.518 6.518 0 0 1 8 10.864c-2.297 0-4.076-1.16-5.213-2.398a10.502 10.502 0 0 1-1.206-1.59 4.426 4.426 0 0 1-.128-.223l.022-.04a8.14 8.14 0 0 1 .506-.745L.92 4.808A9.406 9.406 0 0 0 .1 6.4l-.1.2a.75.75 0 0 0 0 .8C.618 8.622 2.88 11.636 5.997 11.636c.9 0 1.73-.134 2.49-.38l1.255.616Z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /><path fillRule="evenodd" d="M1.38 8.28a.87.87 0 0 1 0-.566 7.003 7.003 0 0 1 13.238.006.87.87 0 0 1 0 .566A7.003 7.003 0 0 1 1.379 8.28ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clipRule="evenodd" /></svg>
                )}
                {showCompleted ? "Hide done" : "Show done"}
              </button>
            )}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-indigo-400 dark:text-indigo-500"><path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" /></svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="w-32 rounded-full border border-indigo-200/60 bg-indigo-50/50 py-1 pl-7 pr-2.5 text-[11px] text-indigo-700 placeholder:text-indigo-300 transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/5 dark:text-indigo-300 dark:placeholder:text-indigo-500/50 dark:focus:border-indigo-500/40 dark:focus:bg-zinc-900 dark:focus:ring-indigo-500/10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add input — top */}
      <div className="border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="pointer-events-none absolute left-2.5 top-[9px] h-3.5 w-3.5 text-indigo-400 z-10">
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
            <MentionTextarea
              value={newTitle}
              onChange={setNewTitle}
              onSubmit={addTodo}
              placeholder="add a to do"
              className="!bg-indigo-50/40 dark:!bg-indigo-500/5"
              inputClassName="!pl-8"
              rows={1}
              minHeight="34px"
              maxHeight="80px"
            />
          </div>
          <button
            type="button"
            onClick={addTodo}
            disabled={!newTitle.trim() || adding}
            className="cursor-pointer flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/20 transition hover:shadow-indigo-500/40 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Add task"
          >
            {adding ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-64 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/50">
        {loading && (
          <div className="space-y-0 divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                <div className="h-5 w-5 flex-shrink-0 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                <div className="flex-1 space-y-1.5">
                  <div className={`h-3.5 rounded bg-zinc-200 dark:bg-zinc-700 ${i === 2 ? 'w-3/5' : i === 3 ? 'w-2/5' : 'w-4/5'}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && todos.length === 0 && !newTitle && (
          <div className="flex flex-col items-center justify-center py-8 px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5 text-indigo-400">
                <path fillRule="evenodd" d="M11.986 3H12a2 2 0 0 1 2 2v6a2 2 0 0 1-1.5 1.937V7A2.5 2.5 0 0 0 10 4.5H4.063A2 2 0 0 1 6 3h.014A2.25 2.25 0 0 1 8.25 1h-.5a2.25 2.25 0 0 1 2.236 2ZM10.5 4v-.75a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0-.75.75V4h5Z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M2 7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7Zm6.585 1.08a.75.75 0 0 1 .336 1.005l-1.75 3.5a.75.75 0 0 1-1.16.234l-1.25-1.25a.75.75 0 0 1 1.06-1.06l.557.556 1.202-2.649a.75.75 0 0 1 1.005-.337Z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">No tasks yet</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Type above to add your first task</p>
          </div>
        )}

        {todos.filter((t) => {
          if (!showCompleted && t.is_completed === 1) return false;
          if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
          return true;
        }).map((todo) => (
          <div
            key={todo.id}
            className={`group flex items-start gap-3 px-5 py-2.5 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 ${
              todo.is_completed ? "bg-zinc-50/50 dark:bg-zinc-800/20" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => toggleTodo(todo)}
              className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all cursor-pointer ${
                todo.is_completed
                  ? "border-indigo-500 bg-indigo-500 text-white dark:border-indigo-400 dark:bg-indigo-500"
                  : "border-zinc-300 bg-white hover:border-indigo-400 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:border-indigo-500"
              }`}
              aria-label={todo.is_completed ? "Mark incomplete" : "Mark complete"}
            >
              {todo.is_completed === 1 && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <div className="min-w-0 flex-1">
              {editingId === todo.id ? (
                <input
                  ref={editRef}
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => saveEdit(todo.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(todo.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="w-full rounded-lg border border-indigo-300 bg-white px-2 py-0.5 text-sm text-zinc-900 outline-none ring-2 ring-indigo-200 dark:border-indigo-500/50 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-indigo-500/20"
                />
              ) : (
                <p
                  onClick={() => { setEditingId(todo.id); setEditingTitle(todo.title); }}
                  className={`cursor-pointer text-sm leading-snug transition ${
                    todo.is_completed
                      ? "text-zinc-400 line-through decoration-zinc-300 dark:text-zinc-500 dark:decoration-zinc-600"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <MentionText text={todo.title} highlight={search} />
                </p>
              )}
              {todo.completed_at && (
                <p className="mt-0.5 text-[10px] text-zinc-400">Completed {relativeTime(todo.completed_at)}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => deleteTodo(todo.id)}
              className="cursor-pointer mt-0.5 flex-shrink-0 rounded-lg p-1 text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              aria-label="Delete todo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        ))}

      </div>

      {/* Footer */}
      {openCount > 0 && doneCount > 0 && (
        <div className="border-t border-zinc-100 px-5 py-2 dark:border-zinc-800">
          <p className="text-[10px] text-zinc-400">{openCount} remaining · {doneCount} completed</p>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Thread List component                                              */
/* ================================================================== */

const AVATAR_COLORS = [
  "from-orange-400 to-amber-400",
  "from-sky-400 to-indigo-400",
  "from-emerald-400 to-teal-400",
  "from-violet-400 to-purple-400",
  "from-pink-400 to-rose-400",
  "from-cyan-400 to-blue-400",
];

function avatarColor(id: number | null) {
  return AVATAR_COLORS[(id ?? 0) % AVATAR_COLORS.length];
}

function ThreadList({ transcriptId, onActivityChange }: { transcriptId: string; onActivityChange?: () => void }) {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchHits, setSearchHits] = useState<PostSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  /* ── Expanded thread state ── */
  const [openThreadId, setOpenThreadId] = useState<number | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const postsEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/threads`);
      if (!res.ok) return;
      const data: ThreadItem[] = await res.json();
      setThreads(data);
      setTotalCount(data.length);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [transcriptId]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  /* Debounced search – hits the backend to search post bodies */
  useEffect(() => {
    if (!search.trim()) { setSearchHits([]); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/transcripts/${transcriptId}/threads/search-posts?q=${encodeURIComponent(search)}`);
        if (res.ok) setSearchHits(await res.json());
      } catch { /* ignore */ } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, transcriptId]);

  const addThread = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        setNewTitle("");
        fetchThreads();
        onActivityChange?.();
      }
    } catch { /* ignore */ } finally { setAdding(false); }
  };

  /* ── Posts for expanded thread ── */
  const fetchPosts = useCallback(async (threadId: number) => {
    setPostsLoading(true);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/threads/${threadId}/posts`);
      if (res.ok) setPosts(await res.json());
    } catch { /* ignore */ } finally { setPostsLoading(false); }
  }, [transcriptId]);

  const openThread = (t: ThreadItem) => {
    if (openThreadId === t.id) {
      setOpenThreadId(null);
      setPosts([]);
      return;
    }
    setOpenThreadId(t.id);
    setPosts([]);
    setReplyBody("");
    fetchPosts(t.id);
  };

  useEffect(() => {
    if (posts.length > 0) postsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [posts.length]);

  const sendReply = async () => {
    if (!replyBody.trim() || !openThreadId) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/threads/${openThreadId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody.trim() }),
      });
      if (res.ok) {
        setPosts(await res.json());
        setReplyBody("");
        onActivityChange?.();
        fetchThreads(); // refresh post counts
      }
    } catch { /* ignore */ } finally { setReplying(false); }
  };

  const openThread_ = openThreadId ? threads.find((t) => t.id === openThreadId) : null;

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {openThread_ ? (
              /* Back button when viewing a thread */
              <button
                type="button"
                onClick={() => { setOpenThreadId(null); setPosts([]); }}
                className="cursor-pointer flex h-5 w-5 items-center justify-center rounded text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label="Back to threads"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25h8.69A.75.75 0 0 1 14 8Z" clipRule="evenodd" />
                </svg>
              </button>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-emerald-500">
                <path d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317.713 2.435 0 3.277 0 4.26v4.48Z" />
              </svg>
            )}
            {openThread_ ? (
              <span className="truncate">{openThread_.title}</span>
            ) : (
              <>
                Threads
                {totalCount > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold tabular-nums text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    {totalCount}
                  </span>
                )}
              </>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {openThread_ ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 ring-1 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
                {posts.length} {posts.length === 1 ? "post" : "posts"}
              </span>
            ) : (
              <>
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-emerald-400 dark:text-emerald-500"><path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" /></svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search messages…"
                    className="w-32 rounded-full border border-emerald-200/60 bg-emerald-50/50 py-1 pl-7 pr-2.5 text-[11px] text-emerald-700 placeholder:text-emerald-300 transition focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-300 dark:placeholder:text-emerald-500/50 dark:focus:border-emerald-500/40 dark:focus:bg-zinc-900 dark:focus:ring-emerald-500/10"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Thread list view ── */}
      {!openThread_ && (
        <>
          {/* Add input */}
          <div className="border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="pointer-events-none absolute left-2.5 top-[9px] h-3.5 w-3.5 text-emerald-400 z-10">
                  <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                </svg>
                <MentionTextarea
                  value={newTitle}
                  onChange={setNewTitle}
                  onSubmit={addThread}
                  placeholder="add a thread"
                  className="!bg-emerald-50/40 dark:!bg-emerald-500/5"
                  inputClassName="!pl-8"
                  rows={1}
                  minHeight="34px"
                  maxHeight="80px"
                />
              </div>
              <button
                type="button"
                onClick={addThread}
                disabled={!newTitle.trim() || adding}
                className="cursor-pointer flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/20 transition hover:shadow-emerald-500/40 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Add thread"
              >
                {adding ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {loading && (
              <div className="space-y-0 divide-y divide-zinc-50 dark:divide-zinc-800/50">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3 animate-pulse">
                    <div className="h-7 w-7 flex-shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex-1 space-y-1.5">
                      <div className={`h-3.5 rounded bg-zinc-200 dark:bg-zinc-700 ${i === 2 ? 'w-3/5' : i === 3 ? 'w-2/5' : 'w-4/5'}`} />
                      <div className="h-2.5 w-1/3 rounded bg-zinc-100 dark:bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !search && threads.length === 0 && !newTitle && (
              <div className="flex flex-col items-center justify-center py-8 px-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5 text-emerald-400">
                    <path d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317.713 2.435 0 3.277 0 4.26v4.48Z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">No threads yet</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Type above to start your first thread</p>
              </div>
            )}

            {searching && (
              <div className="flex items-center justify-center py-6">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            )}

            {/* ── Search results: show matching posts ── */}
            {search.trim() && !searching && searchHits.map((hit) => (
              <button
                key={hit.id}
                type="button"
                onClick={() => {
                  const t = threads.find((th) => th.id === hit.thread_id);
                  if (t) { setSearch(""); openThread(t); }
                  else {
                    setSearch("");
                    setOpenThreadId(hit.thread_id);
                    setPosts([]);
                    setReplyBody("");
                    fetchPosts(hit.thread_id);
                  }
                }}
                className="flex w-full items-start gap-3 px-5 py-2.5 text-left transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 cursor-pointer"
              >
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-200/60 dark:from-emerald-500/20 dark:to-teal-500/20 dark:text-emerald-300 dark:ring-emerald-500/30">
                  {hit.created_by_name ? getSpeakerInitials(hit.created_by_name) : "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                    {hit.thread_title}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
                    <MentionText text={hit.body} highlight={search} />
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-400">
                    {hit.created_by_name && <span className="truncate">{hit.created_by_name}</span>}
                    <span className="flex-shrink-0">{relativeTime(hit.created_at)}</span>
                  </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="mt-1.5 h-3.5 w-3.5 flex-shrink-0 text-zinc-300 dark:text-zinc-600">
                  <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            ))}

            {search.trim() && !searching && searchHits.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 px-5">
                <p className="text-xs text-zinc-400">No messages match &ldquo;{search}&rdquo;</p>
              </div>
            )}

            {/* ── Normal thread list (when not searching) ── */}
            {!search && threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openThread(t)}
                className="flex w-full items-start gap-3 px-5 py-2.5 text-left transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 cursor-pointer"
              >
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-200/60 dark:from-emerald-500/20 dark:to-teal-500/20 dark:text-emerald-300 dark:ring-emerald-500/30">
                  {t.created_by_name ? getSpeakerInitials(t.created_by_name) : "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                    <MentionText text={t.title} />
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-400">
                    {t.created_by_name && <span className="truncate">{t.created_by_name}</span>}
                    <span className="flex-shrink-0 flex items-center gap-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5"><path d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317.713 2.435 0 3.277 0 4.26v4.48Z" /></svg>
                      {t.post_count}
                    </span>
                    <span className="flex-shrink-0">{relativeTime(t.latest_post_at ?? t.created_at)}</span>
                  </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="mt-1.5 h-3.5 w-3.5 flex-shrink-0 text-zinc-300 dark:text-zinc-600">
                  <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Inline thread detail view ── */}
      {openThread_ && (
        <>
          {/* Sub-header: thread author info */}
          <div className="border-b border-zinc-100 px-5 py-2 dark:border-zinc-800">
            <p className="text-[10px] text-zinc-400">
              Started by {openThread_.created_by_name ?? "Unknown"} · {relativeTime(openThread_.created_at)}
            </p>
          </div>

          {/* Posts */}
          <div className="max-h-72 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {postsLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              </div>
            )}

            {!postsLoading && posts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-5">
                <p className="text-xs text-zinc-400">No replies yet — be the first!</p>
              </div>
            )}

            {posts.map((post) => (
              <div key={post.id} className="flex items-start gap-2.5 px-4 py-2.5">
                <div
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[8px] font-bold text-white ${avatarColor(post.created_by)}`}
                >
                  {getSpeakerInitials(post.created_by_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {post.created_by_name ?? "Unknown"}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {relativeTime(post.created_at)}
                    </span>
                    {post.edited_at && (
                      <span className="text-[10px] italic text-zinc-400">(edited)</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-words">
                    <MentionText text={post.body} />
                  </p>
                </div>
              </div>
            ))}
            <div ref={postsEndRef} />
          </div>

          {/* Reply compose */}
          <div className="border-t border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <MentionTextarea
                value={replyBody}
                onChange={setReplyBody}
                onSubmit={sendReply}
                placeholder="write a reply…"
                className="flex-1 !bg-emerald-50/40 dark:!bg-emerald-500/5"
                rows={1}
                minHeight="34px"
                maxHeight="80px"
                disabled={replying}
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={!replyBody.trim() || replying}
                className="cursor-pointer flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/20 transition hover:shadow-emerald-500/40 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send reply"
              >
                {replying ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M2.87 2.298a.75.75 0 0 0-.812 1.021L3.39 6.624a1 1 0 0 0 .928.626H8.25a.75.75 0 0 1 0 1.5H4.318a1 1 0 0 0-.927.626l-1.333 3.305a.75.75 0 0 0 .812 1.021l11.07-3.548a.75.75 0 0 0 0-1.408L2.87 2.298Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Overview Page                                                      */
/* ================================================================== */

export default function TranscriptOverviewPage() {
  const params = useParams<{ transcriptId: string }>();
  const transcriptId = params.transcriptId;

  const [data, setData] = useState<TranscriptOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activitySearch, setActivitySearch] = useState("");
  const [commentsSearch, setCommentsSearch] = useState("");

  const fetchOverview = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const r = await fetch(`/api/transcripts/${transcriptId}/overview`);
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      setData(await r.json());
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [transcriptId]);

  const refreshActivity = useCallback(() => {
    fetchOverview(false);
  }, [fetchOverview]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading) {
    return (
      <section className="space-y-6">
        {/* Header skeleton */}
        <div className="relative rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden animate-pulse">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-200 via-amber-200 to-orange-200 dark:from-orange-800 dark:via-amber-800 dark:to-orange-800" />
          <div className="flex flex-wrap items-center gap-4 px-4 pt-5 pb-4">
            <div className="h-5 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-5 w-20 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex-1" />
            <div className="h-8 w-28 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
          </div>
        </div>

        {/* Top row: Todo + Threads */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Todo card */}
          <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
              <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-indigo-500">
                  <path fillRule="evenodd" d="M11.986 3H12a2 2 0 0 1 2 2v6a2 2 0 0 1-1.5 1.937V7A2.5 2.5 0 0 0 10 4.5H4.063A2 2 0 0 1 6 3h.014A2.25 2.25 0 0 1 8.25 1h-.5a2.25 2.25 0 0 1 2.236 2ZM10.5 4v-.75a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0-.75.75V4h5Z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M2 7a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7Zm6.585 1.08a.75.75 0 0 1 .336 1.005l-1.75 3.5a.75.75 0 0 1-1.16.234l-1.25-1.25a.75.75 0 0 1 1.06-1.06l.557.556 1.202-2.649a.75.75 0 0 1 1.005-.337Z" clipRule="evenodd" />
                </svg>
                To-Do
              </h2>
            </div>
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          </div>

          {/* Threads card */}
          <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
              <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-emerald-500">
                  <path d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317.713 2.435 0 3.277 0 4.26v4.48Z" />
                </svg>
                Threads
              </h2>
            </div>
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          </div>
        </div>

        {/* Bottom row: Comments + Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Comments card */}
          <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
              <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-sky-500">
                  <path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317 .713 2.435 0 3.277 0 4.26v4.48Z" clipRule="evenodd" />
                </svg>
                Recent Comments
              </h2>
            </div>
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            </div>
          </div>

          {/* Activity card */}
          <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
              <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-orange-500">
                  <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
                </svg>
                Recent Activity
              </h2>
            </div>
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="flex flex-col items-center justify-center gap-6 py-24">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-red-500">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{error ?? "Not found"}</p>
      </section>
    );
  }

  const { speakers, recent_activity, recent_comments } = data;

  const detailStats = [
    { label: "Sections", value: data.total_sections, icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-orange-500"><path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm4.5 2a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Zm0 3a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" /></svg>
    )},
    { label: "Edited", value: data.edited_sections, icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-amber-500"><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" /><path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" /></svg>
    )},
    { label: "Comments", value: data.total_comments, icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-sky-500"><path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317 .713 2.435 0 3.277 0 4.26v4.48Z" clipRule="evenodd" /></svg>
    )},
    { label: "Speakers", value: speakers.length, icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-violet-500"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" /></svg>
    )},
    { label: "Duration", value: data.total_duration ?? "—", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-emerald-500"><path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" /></svg>
    )},
  ];

  return (
    <section className="space-y-6">
      {/* ── Transcript Header ── */}
      <div className="relative rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 pt-4 pb-3">
          {/* Title with emoji indicators */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {(() => {
              const raw = data.title ?? `Transcript #${transcriptId}`;
              const parts = raw.split(" — ");
              const participantName = parts[0]?.trim();
              // Extract mic label from the part after "—", stripping "Lesson X" at the end
              const afterDash = parts[1]?.trim() ?? "";
              const micLabel = afterDash.replace(/\s*Lesson\s+\S+$/i, "").trim();
              return (
                <>
                  <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
                    {participantName}
                  </span>
                  {micLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
                      🎙️ {micLabel}
                    </span>
                  )}
                  {data.lesson_number && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200/80 dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20">
                      📓 Lesson {data.lesson_number}
                    </span>
                  )}
                </>
              );
            })()}
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-800/50">
            {detailStats.map((s, i) => (
              <div key={s.label} className="flex items-center gap-1" title={s.label}>
                {s.icon}
                <span className="text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-300">{s.value}</span>
                {i < detailStats.length - 1 && <span className="ml-2 text-zinc-200 dark:text-zinc-700">·</span>}
              </div>
            ))}
          </div>

          {/* Editor button */}
          <Link
            href={`/transcriptions/${transcriptId}/editor`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:shadow-orange-500/30 hover:brightness-110 active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
              <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
            </svg>
            Open Editor
          </Link>
        </div>
      </div>

      {/* ── Top row: Todo + Threads ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TodoList transcriptId={transcriptId} onActivityChange={refreshActivity} />
        <ThreadList transcriptId={transcriptId} onActivityChange={refreshActivity} />
      </div>

      {/* ── Bottom row: Recent Comments + Recent Activity ── */}
      <div className="grid gap-6 lg:grid-cols-2">

      {/* ── Recent Comments ── */}
      <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-sky-500">
                <path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317 .713 2.435 0 3.277 0 4.26v4.48Z" clipRule="evenodd" />
              </svg>
              Recent Comments
              {recent_comments.length > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sky-100 px-1.5 text-[10px] font-bold tabular-nums text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
                  {recent_comments.length}
                </span>
              )}
            </h2>
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-sky-400 dark:text-sky-500"><path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" /></svg>
              <input
                type="text"
                value={commentsSearch}
                onChange={(e) => setCommentsSearch(e.target.value)}
                placeholder="Search comments…"
                className="w-32 rounded-full border border-sky-200/60 bg-sky-50/50 py-1 pl-7 pr-2.5 text-[11px] text-sky-700 placeholder:text-sky-300 transition focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-sky-500/20 dark:bg-sky-500/5 dark:text-sky-300 dark:placeholder:text-sky-500/50 dark:focus:border-sky-500/40 dark:focus:bg-zinc-900 dark:focus:ring-sky-500/10"
              />
            </div>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/50">
          {recent_comments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 px-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-500/10 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5 text-sky-400">
                  <path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317 .713 2.435 0 3.277 0 4.26v4.48Z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">No comments yet</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Comments from the editor will appear here</p>
            </div>
          )}
          {recent_comments.filter((c) => {
            if (!commentsSearch) return true;
            const q = commentsSearch.toLowerCase();
            return c.comment.toLowerCase().includes(q)
              || (c.user_display_name ?? "").toLowerCase().includes(q);
          }).map((c) => (
            <div key={c.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 text-[9px] font-bold text-sky-700 ring-1 ring-sky-200/60 dark:from-sky-500/20 dark:to-indigo-500/20 dark:text-sky-300 dark:ring-sky-500/30">
                {c.user_display_name ? getSpeakerInitials(c.user_display_name) : "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">{c.user_display_name ?? "Unknown"}</span>
                  <span className="flex-shrink-0 inline-flex items-center rounded-full bg-sky-50 px-1.5 py-px text-[9px] font-semibold tabular-nums text-sky-600 ring-1 ring-sky-200/60 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/20">§{c.section_id}</span>
                  <span className="flex-shrink-0 text-[10px] text-zinc-400">{relativeTime(c.created_at)}</span>
                </div>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 break-words"><MentionText text={c.comment} highlight={commentsSearch} /></p>
              </div>
            </div>
          ))}
          {recent_comments.length > 0 && recent_comments.filter((c) => {
            if (!commentsSearch) return true;
            const q = commentsSearch.toLowerCase();
            return c.comment.toLowerCase().includes(q)
              || (c.user_display_name ?? "").toLowerCase().includes(q);
          }).length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 px-5">
              <p className="text-xs text-zinc-400">No comments match &ldquo;{commentsSearch}&rdquo;</p>
            </div>
          )}
        </div>
      </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-orange-500">
                  <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
                </svg>
                Recent Activity
              </h2>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-orange-400 dark:text-orange-500"><path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" /></svg>
                <input
                  type="text"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Search activity…"
                  className="w-32 rounded-full border border-orange-200/60 bg-orange-50/50 py-1 pl-7 pr-2.5 text-[11px] text-orange-700 placeholder:text-orange-300 transition focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 dark:border-orange-500/20 dark:bg-orange-500/5 dark:text-orange-300 dark:placeholder:text-orange-500/50 dark:focus:border-orange-500/40 dark:focus:bg-zinc-900 dark:focus:ring-orange-500/10"
                />
              </div>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/50">
            {recent_activity.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5 text-orange-400">
                    <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">No activity yet</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">Actions will appear here as they happen</p>
              </div>
            )}
            {(() => {
              const cleanSummary = (raw: string | null) =>
                (raw ?? "").replace(/^(?:Edited text in|Commented on|Added comment on|Deleted) section #\d+[:\s]*/i, "").replace(/^"|"$/g, "");

              const filteredActivity = recent_activity.filter((a) => {
                if (!activitySearch) return true;
                const q = activitySearch.toLowerCase();
                const meta = ACTION_LABELS[a.action];
                return (meta?.label ?? a.action).toLowerCase().includes(q)
                  || cleanSummary(a.summary).toLowerCase().includes(q)
                  || (a.user_display_name ?? "").toLowerCase().includes(q);
              });

              if (recent_activity.length > 0 && filteredActivity.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-6 px-5">
                    <p className="text-xs text-zinc-400">No activity matches &ldquo;{activitySearch}&rdquo;</p>
                  </div>
                );
              }

              return filteredActivity.map((a) => {
                const meta = ACTION_LABELS[a.action] ?? { label: a.action, color: "text-zinc-500" };
                const cleaned = cleanSummary(a.summary);
                return (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <span className="h-2 w-2 rounded-full bg-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                        <span className={`font-semibold ${meta.color}`}>{meta.label}</span>
                        {a.section_id != null && <span className="inline-flex items-center rounded-full bg-orange-50 px-1.5 py-px text-[9px] font-semibold tabular-nums text-orange-600 ring-1 ring-orange-200/60 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20">§{a.section_id}</span>}
                      </p>
                      {cleaned && <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1 break-words"><MentionText text={cleaned} highlight={activitySearch} /></p>}
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-400">
                        {a.user_display_name && <span className="truncate">{a.user_display_name}</span>}
                        <span className="flex-shrink-0">{relativeTime(a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

      </div>{/* end bottom row grid */}
    </section>
  );
}
