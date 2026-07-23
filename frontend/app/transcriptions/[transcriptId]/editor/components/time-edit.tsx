"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { formatTimestamp, normalizeTimestamp } from "../lib/helpers";

/**
 * Click-to-edit control for a single section timestamp (begin or end).
 * Renders as a compact monospace value that turns into a text input on click;
 * the entered value is normalized to HH:MM:SS(.mmm) before saving.
 */
export default function TimeEdit({
  value,
  onSave,
  onEditStart,
  label,
}: {
  value: string | null;
  onSave: (v: string) => void;
  onEditStart?: () => void;
  label?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [lastValue, setLastValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft when the incoming value changes (e.g. after a save/refetch),
  // but never clobber an edit the user is in the middle of typing.
  if (value !== lastValue) {
    setLastValue(value);
    if (!editing) setDraft(value ?? "");
  }

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const normalized = normalizeTimestamp(draft);
    if (normalized !== (value ?? "")) onSave(normalized);
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape") cancel();
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { onEditStart?.(); setEditing(true); }}
        className="cursor-pointer rounded px-1 py-0.5 transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
        title={label ? `Edit ${label}` : "Click to edit"}
      >
        {formatTimestamp(value)}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKey}
      aria-label={label}
      placeholder="HH:MM:SS"
      className="w-24 rounded border-2 border-orange-400 bg-white px-1.5 py-0.5 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-300 dark:border-orange-500/60 dark:bg-zinc-900 dark:text-zinc-100"
    />
  );
}
