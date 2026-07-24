"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * In-app feedback panel. To the user it's simply "send feedback about the app" —
 * no mention of tasks, boards, or Bloom. Behind the scenes the note plus rich
 * page/session context is relayed to the team's board as a task (see
 * app/api/bloom-feedback). Opens via the hidden shortcut Ctrl/Cmd+Shift+F, or by
 * adding #feedback to the URL.
 */
export default function BloomFeedback() {
  const { user } = useAuth();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Record the in-app navigation trail (where they've been) for context.
  const navTrailRef = useRef<string[]>([]);
  useEffect(() => {
    const trail = navTrailRef.current;
    if (trail[trail.length - 1] !== pathname) {
      trail.push(pathname);
      if (trail.length > 12) trail.shift();
    }
  }, [pathname]);

  // Open via Ctrl/Cmd+Shift+F, or by adding #feedback to the URL. Escape closes.
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash.toLowerCase() === "#feedback") {
        setOpen(true);
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
    };
    openFromHash();

    const onKey = (e: KeyboardEvent) => {
      const isF = e.code === "KeyF" || e.key === "f" || e.key === "F";
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && isF) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", openFromHash);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", openFromHash);
    };
  }, []);

  // Reset transient state and focus the textarea whenever the panel opens.
  useEffect(() => {
    if (open) {
      setStatus("idle");
      setErrorMsg(null);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [open]);

  const submit = useCallback(async () => {
    const body = text.trim();
    if (!body || status === "sending") return;
    setStatus("sending");
    setErrorMsg(null);

    // Gather rich context the user never sees, so the team can triage with insight.
    const now = new Date();
    const context = {
      path: pathname,
      url: window.location.href,
      pageTitle: document.title,
      referrer: document.referrer || null,
      navTrail: navTrailRef.current.slice(-8),
      localTime: now.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isoTime: now.toISOString(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      screen: `${window.screen.width}×${window.screen.height}`,
      author: user?.display_name || user?.user_name || null,
      email: user?.user_email || null,
    };

    try {
      const res = await fetch("/api/bloom-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, context }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed (${res.status})`);
      }
      setStatus("sent");
      setText("");
      setTimeout(() => setOpen(false), 1400);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }, [text, pathname, user, status]);

  if (!user || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-24"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">💬</span>
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Send feedback
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="p-4">
          {status === "sent" ? (
            <div className="flex flex-col items-center gap-1.5 py-6 text-center">
              <span className="text-3xl" aria-hidden="true">🙌</span>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Thanks for your feedback!
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                We&apos;ve shared it with the team.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                Notice something off, or have an idea? Let us know — we read every note.
              </p>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={5}
                placeholder="What's on your mind about this page?"
                className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-orange-500/50 dark:focus:ring-orange-500/20"
              />

              {errorMsg && (
                <p className="mt-2 text-xs text-red-500">
                  Couldn&apos;t send that — please try again.
                </p>
              )}

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  ⌘/Ctrl+Enter to send
                </span>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!text.trim() || status === "sending"}
                  className="cursor-pointer rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:cursor-default disabled:opacity-50"
                >
                  {status === "sending" ? "Sending…" : "Send feedback"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
