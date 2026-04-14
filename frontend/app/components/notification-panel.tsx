"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/* ── Types ── */

interface Notification {
  id: number;
  user_id: number;
  actor_user_id: number | null;
  actor_display_name: string | null;
  notification_type: string;
  category: string;
  priority: string;
  title: string;
  message: string | null;
  route: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: number;
  read_at: string | null;
  created_at: string | null;
}

/* ── Helpers ── */

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
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

const CATEGORY_COLORS: Record<string, string> = {
  mention: "bg-sky-500",
  todo: "bg-indigo-500",
  comment: "bg-amber-500",
  system: "bg-zinc-500",
};

/* ── Component ── */

export default function NotificationPanel() {
  const { user } = useAuth();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  /* ── Poll unread count every 30 s ── */
  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications/unread-count?user_id=${user.user_id}`);
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  /* ── Fetch full list when panel opens ── */
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?user_id=${user.user_id}&limit=20`);
      if (res.ok) setNotifications(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  /* ── Close on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Actions ── */
  const markRead = async (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
    try {
      await fetch(`/api/notifications/read-all?user_id=${user.user_id}`, { method: "PUT" });
    } catch { /* ignore */ }
  };

  const dismiss = async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => {
      const n = notifications.find((x) => x.id === id);
      return n && n.is_read === 0 ? Math.max(0, c - 1) : c;
    });
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    } catch { /* ignore */ }
  };

  const clearAll = async () => {
    if (!user) return;
    setNotifications([]);
    setUnreadCount(0);
    try {
      await fetch(`/api/notifications?user_id=${user.user_id}`, { method: "DELETE" });
    } catch { /* ignore */ }
  };

  const handleClick = (n: Notification) => {
    if (n.is_read === 0) markRead(n.id);
    if (n.route) {
      router.push(n.route);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Bell button ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative cursor-pointer rounded-md p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="cursor-pointer text-[11px] font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="cursor-pointer text-[11px] font-medium text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading && notifications.length === 0 && (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-10">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-10 w-10 text-zinc-300 dark:text-zinc-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9" />
                </svg>
                <p className="text-xs text-zinc-400">No notifications yet</p>
              </div>
            )}

            {notifications.map((n) => (
              <div
                key={n.id}
                className={`group flex items-start gap-3 border-b border-zinc-50 px-4 py-3 transition-colors dark:border-zinc-800/50 ${
                  n.is_read === 0
                    ? "bg-sky-50/50 dark:bg-sky-500/5"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                }`}
              >
                {/* Dot indicator */}
                <div className="mt-1.5 flex-shrink-0">
                  <span
                    className={`block h-2 w-2 rounded-full ${
                      n.is_read === 0 ? (CATEGORY_COLORS[n.category] ?? "bg-sky-500") : "bg-transparent"
                    }`}
                  />
                </div>

                {/* Content */}
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{n.title}</p>
                  {n.message && (
                    <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2 dark:text-zinc-400">
                      {n.message}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-400">
                    {n.actor_display_name && <span>{n.actor_display_name}</span>}
                    <span>{relativeTime(n.created_at)}</span>
                    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {n.category}
                    </span>
                  </div>
                </button>

                {/* Dismiss */}
                <button
                  type="button"
                  onClick={() => dismiss(n.id)}
                  className="mt-0.5 flex-shrink-0 cursor-pointer rounded-md p-1 text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  aria-label="Dismiss"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
