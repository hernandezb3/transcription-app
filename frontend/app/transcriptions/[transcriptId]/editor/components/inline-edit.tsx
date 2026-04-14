"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import HighlightText from "./highlight-text";

export default function InlineEdit({
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
