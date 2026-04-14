"use client";

import React, { useCallback, useEffect, useRef, useState, forwardRef } from "react";

/* ── Types ── */

interface UserSuggestion {
  id: number;
  user_name: string;
  display_name: string | null;
  user_email: string | null;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Extra classes for the outer wrapper */
  className?: string;
  /** Extra padding / layout classes applied to both the textarea and the highlight mirror (e.g. `!pl-8`). Do NOT put background or border classes here. */
  inputClassName?: string;
  /** Submit handler (Enter without Shift) */
  onSubmit?: () => void;
  disabled?: boolean;
  rows?: number;
  minHeight?: string;
  maxHeight?: string;
}

/**
 * A textarea with @mention autocomplete.
 *
 * When the user types `@`, the component queries `/api/users/search?q=…`
 * and shows a floating suggestion list. Selecting a suggestion inserts
 * `@username ` into the text at the cursor position.
 */
const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  function MentionTextarea(
    {
      value,
      onChange,
      placeholder = "Type @ to mention a user…",
      className = "",
      inputClassName = "",
      onSubmit,
      disabled = false,
      rows = 1,
      minHeight = "28px",
      maxHeight = "120px",
    },
    forwardedRef,
  ) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync the internal textarea ref to the forwarded (parent) ref
  useEffect(() => {
    if (!forwardedRef) return;
    const node = textareaRef.current;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
      return () => forwardedRef(null);
    } else {
      (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      return () => {
        (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = null;
      };
    }
  }, [forwardedRef]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  /* ── Auto-resize ── */
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, parseInt(maxHeight))}px`;
    }
  }, [maxHeight]);

  useEffect(() => { autoResize(); }, [value, autoResize]);

  /* ── Fetch users ── */
  useEffect(() => {
    if (!showDropdown) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=8`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data: UserSuggestion[] = await res.json();
          setSuggestions(data);
          setSelectedIdx(0);
        }
      } catch {
        /* aborted or network error */
      }
    }, 150); // small debounce

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, showDropdown]);

  /* ── Detect @mention trigger ── */
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursor = e.target.selectionStart ?? newValue.length;
    // Walk backwards from cursor to find an unmatched '@'
    let atPos: number | null = null;
    for (let i = cursor - 1; i >= 0; i--) {
      const ch = newValue[i];
      if (ch === "@") {
        // '@' must be at start or preceded by whitespace
        if (i === 0 || /\s/.test(newValue[i - 1])) {
          atPos = i;
        }
        break;
      }
      if (/\s/.test(ch)) break; // stop at whitespace
    }

    if (atPos !== null) {
      const partial = newValue.slice(atPos + 1, cursor);
      setMentionStart(atPos);
      setQuery(partial);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
      setMentionStart(null);
      setQuery("");
    }
  };

  /* ── Insert mention ── */
  const insertMention = useCallback(
    (user: UserSuggestion) => {
      if (mentionStart === null) return;
      const before = value.slice(0, mentionStart);
      const cursor = textareaRef.current?.selectionStart ?? value.length;
      const after = value.slice(cursor);
      const inserted = `@${user.user_name} `;
      const next = before + inserted + after;
      onChange(next);
      setShowDropdown(false);
      setMentionStart(null);
      setQuery("");

      // restore focus & cursor
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          const pos = before.length + inserted.length;
          el.focus();
          el.setSelectionRange(pos, pos);
        }
      });
    },
    [mentionStart, value, onChange],
  );

  /* ── Keyboard nav ── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(suggestions[selectedIdx]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowDropdown(false);
        return;
      }
    }

    // Normal Enter → submit
    if (e.key === "Enter" && !e.shiftKey && !showDropdown) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Render highlighted mirror of the value ── */
  const renderHighlighted = useCallback((text: string) => {
    const parts = text.split(/(@[\w.\-]+)/g);
    return parts.map((part, i) =>
      part.startsWith("@") ? (
        <span
          key={i}
          className="rounded bg-sky-100 px-0.5 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
        >
          {part}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );
  }, []);

  /* ── Sync highlight scroll with textarea scroll ── */
  const highlightRef = useRef<HTMLDivElement>(null);
  const handleScroll = useCallback(() => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  return (
    <div className={`relative rounded-lg bg-zinc-50 dark:bg-zinc-800 ${className}`}>
      {/* Highlight mirror layer — behind the textarea */}
      <div
        ref={highlightRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-0 overflow-hidden whitespace-pre-wrap break-words rounded-lg px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 ${inputClassName}`}
        style={{ minHeight, maxHeight }}
      >
        {renderHighlighted(value)}
        {/* Invisible trailing character to keep height in sync */}
        <span className="invisible">&#8203;</span>
      </div>

      {/* Actual textarea — transparent text, visible caret */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`relative z-10 w-full resize-none overflow-hidden rounded-lg border border-zinc-200 px-3 py-1.5 text-sm caret-zinc-900 placeholder:text-zinc-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:caret-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-sky-500/50 dark:focus:ring-sky-500/20 ${inputClassName}`}
        style={{ minHeight, maxHeight, background: 'transparent', color: 'transparent', WebkitTextFillColor: value ? 'transparent' : undefined }}
      />

      {/* ── Suggestion dropdown ── */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 z-50 mt-1 max-h-52 w-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        >
          {suggestions.map((user, idx) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // don't blur textarea
                insertMention(user);
              }}
              className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                idx === selectedIdx
                  ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {/* Avatar circle */}
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 text-[10px] font-bold text-sky-700 ring-1 ring-sky-200/60 dark:from-sky-500/20 dark:to-indigo-500/20 dark:text-sky-300 dark:ring-sky-500/30">
                {(user.display_name || user.user_name)
                  .split(/[\s_-]+/)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{user.display_name || user.user_name}</span>
                <span className="ml-1.5 text-xs text-zinc-400">@{user.user_name}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {showDropdown && query.length > 0 && suggestions.length === 0 && (
        <div className="absolute left-0 z-50 mt-1 w-64 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-xs text-zinc-400 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          No users found for &ldquo;@{query}&rdquo;
        </div>
      )}
    </div>
  );
  },
);

export default MentionTextarea;
