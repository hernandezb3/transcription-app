"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type Category = "feature" | "fix" | "chore";
type Priority = "low" | "medium" | "high" | "critical";

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "fix", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "chore", label: "Chore" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Urgent" },
];

/**
 * Hidden "send feedback to Bloom" panel. There is no visible affordance — it
 * opens only via the keyboard shortcut Ctrl/Cmd + Shift + F, so regular users
 * never stumble onto it. Feedback is relayed server-side (see
 * app/api/bloom-feedback/route.ts) to the Bloom worklog.
 */
export default function BloomFeedback() {
  const { user } = useAuth();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category>("fix");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ways to open the panel (all hidden from regular users):
  //  1. Keyboard: Ctrl/Cmd + Shift + F  (may be swallowed by some browsers)
  //  2. URL hash: add #feedback to the address  (bulletproof fallback)
  // Escape closes it. A console line on mount confirms the component loaded.
  useEffect(() => {
    console.info(
      "[bloom-feedback] ready — press Ctrl/Cmd+Shift+F, or add #feedback to the URL",
    );

    const openFromHash = () => {
      if (window.location.hash.toLowerCase() === "#feedback") {
        setOpen(true);
        // Clear the hash so closing/reopening behaves normally.
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
    try {
      const res = await fetch("/api/bloom-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          priority,
          body,
          context: {
            path: pathname,
            author: user?.display_name || user?.user_name || undefined,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed (${res.status})`);
      }
      setStatus("sent");
      setText("");
      setTimeout(() => setOpen(false), 900);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }, [text, category, priority, pathname, user, status]);

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
            <span className="text-base" aria-hidden="true">🌸</span>
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Feedback to Bloom
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
          {/* type */}
          <div className="mb-2 flex gap-1.5">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  category === opt.value
                    ? "bg-orange-500 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* priority */}
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">Priority</span>
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPriority(opt.value)}
                className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                  priority === opt.value
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

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
            placeholder="Describe the bug, feature, or change — the first line becomes the task title…"
            className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-orange-500/50 dark:focus:ring-orange-500/20"
          />

          {errorMsg && <p className="mt-2 text-xs text-red-500">{errorMsg}</p>}

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Creates a Bloom task · ⌘/Ctrl+Enter
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim() || status === "sending"}
              className="cursor-pointer rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:cursor-default disabled:opacity-50"
            >
              {status === "sending" ? "Creating…" : status === "sent" ? "Created ✓" : "Create task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
