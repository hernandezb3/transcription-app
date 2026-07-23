"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";

type SpeakerColor = { bg: string; text: string; ring: string };

/**
 * Click-to-edit speaker control for a single transcript section.
 *
 * Displays the speaker avatar + name. Clicking opens a small combobox where the
 * user can pick an existing speaker or type a brand-new name. The chosen name is
 * passed to `onSave` (the backend resolves it to / creates a speaker record).
 */
export default function SpeakerSelect({
  value,
  options,
  onSave,
  onEditStart,
  color,
  getInitials,
}: {
  value: string | null;
  options: string[];
  onSave: (name: string) => void;
  onEditStart?: () => void;
  color: SpeakerColor;
  getInitials: (speaker: string | null) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [lastValue, setLastValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft when the incoming value changes (e.g. after a save/refetch),
  // but never clobber a name the user is in the middle of typing.
  if (value !== lastValue) {
    setLastValue(value);
    if (!editing) setDraft(value ?? "");
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Commit-or-cancel on outside click
  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commit(draft);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, draft]);

  const commit = (name: string) => {
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed !== (value ?? "")) onSave(trimmed);
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(draft);
    }
    if (e.key === "Escape") cancel();
  };

  const filtered = draft.trim()
    ? options.filter((o) => o.toLowerCase().includes(draft.trim().toLowerCase()) && o !== draft.trim())
    : options;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { onEditStart?.(); setEditing(true); }}
        className="group/spk flex items-center gap-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        title="Click to change speaker"
      >
        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ring-2 ${color.bg} ${color.text} ${color.ring}`}>
          {getInitials(value)}
        </div>
        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          {value ? value : <span className="italic text-zinc-400">Set speaker</span>}
        </span>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Speaker name"
        className="w-44 rounded-lg border-2 border-orange-400 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-300 dark:border-orange-500/60 dark:bg-zinc-900 dark:text-zinc-100"
      />
      {filtered.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-52 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              // onMouseDown so the choice registers before the input's blur/outside-click
              onMouseDown={(e) => { e.preventDefault(); commit(opt); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-zinc-700 transition-colors hover:bg-orange-50 hover:text-orange-700 dark:text-zinc-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[8px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {getInitials(opt)}
              </div>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
