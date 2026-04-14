"use client";

import { useState, useEffect, useRef } from "react";
import type { TranscriptSpeaker } from "../lib/types";

export default function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
  icon,
  className: wrapperClassName = "",
  speakers,
  onSpeakerSave,
  getSpeakerColor: getSpeakerColorFn,
  getSpeakerInitials: getSpeakerInitialsFn,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  icon: React.ReactNode;
  className?: string;
  speakers?: TranscriptSpeaker[];
  onSpeakerSave?: (speakerId: number, newName: string) => void;
  getSpeakerColor?: (speaker: string | null) => { bg: string; text: string; ring: string };
  getSpeakerInitials?: (speaker: string | null) => string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingSpeakerId, setEditingSpeakerId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const hasSpeakers = speakers && onSpeakerSave && getSpeakerColorFn && getSpeakerInitialsFn;

  const activeSpeakers = hasSpeakers
    ? speakers.filter((s) => s.is_active === 1 && s.display_name)
    : [];

  const filteredSpeakers = activeSpeakers.filter((s) =>
    (s.display_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (editingSpeakerId !== null) {
      setTimeout(() => editInputRef.current?.focus(), 0);
    }
  }, [editingSpeakerId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditingSpeakerId(null);
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setSearch("");
    setEditingSpeakerId(null);
  };

  const startEditing = (spk: TranscriptSpeaker) => {
    setEditingSpeakerId(spk.id);
    setEditDraft(spk.display_name ?? "");
  };

  const commitEdit = (spk: TranscriptSpeaker) => {
    const trimmed = editDraft.trim();
    if (trimmed && trimmed !== spk.display_name && onSpeakerSave) {
      onSpeakerSave(spk.id, trimmed);
      if (value === spk.display_name) onChange(trimmed);
    }
    setEditingSpeakerId(null);
  };

  const cancelEdit = () => setEditingSpeakerId(null);

  const displayLabel = value || placeholder;

  return (
    <div ref={containerRef} className={`relative ${wrapperClassName}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setEditingSpeakerId(null);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-xl border bg-zinc-50 py-2 pl-3 pr-3 text-sm font-medium shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 hover:shadow focus:outline-none dark:bg-zinc-800 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 ${
          open
            ? "border-orange-400 ring-2 ring-orange-200 dark:border-orange-500/50 dark:ring-orange-500/20"
            : "border-zinc-200 dark:border-zinc-700"
        }`}
      >
        <span className="flex-shrink-0 text-zinc-400">{icon}</span>
        <span className={`truncate ${value ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-500"}`}>
          {displayLabel}
        </span>
        {value && (
          <span
            onClick={(e) => { e.stopPropagation(); select(""); }}
            className="ml-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
            aria-label="Clear filter"
          >
            ×
          </span>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className={`absolute right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800 ${hasSpeakers ? "w-72" : "w-56"}`}>
          <div className="border-b border-zinc-100 p-2 dark:border-zinc-700">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400">
                <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-lg bg-zinc-50 py-1.5 pl-8 pr-3 text-sm placeholder:text-zinc-400 focus:outline-none dark:bg-zinc-900 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => select("")}
              className={`w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10 ${
                !value ? "font-semibold text-orange-600 dark:text-orange-400" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {placeholder}
            </button>

            {hasSpeakers ? (
              <>
                {filteredSpeakers.length === 0 && (
                  <p className="px-3 py-3 text-center text-xs text-zinc-400">No matches found</p>
                )}
                {filteredSpeakers.map((spk) => {
                  const color = getSpeakerColorFn(spk.display_name);
                  const initials = getSpeakerInitialsFn(spk.display_name);
                  const isEditing = editingSpeakerId === spk.id;
                  const isSelected = value === spk.display_name;

                  return (
                    <div
                      key={spk.id}
                      className={`group flex items-center gap-2 px-2 py-1.5 transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10 ${
                        isSelected ? "bg-orange-50 dark:bg-orange-500/10" : ""
                      }`}
                    >
                      <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold ring-1 ${color.bg} ${color.text} ${color.ring}`}>
                        {initials}
                      </div>

                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commitEdit(spk); }
                            if (e.key === "Escape") cancelEdit();
                          }}
                          onBlur={() => commitEdit(spk)}
                          className="flex-1 min-w-0 rounded-md border border-orange-400 bg-orange-50/50 px-2 py-0.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-orange-400 dark:border-orange-500/60 dark:bg-orange-500/5 dark:text-zinc-100"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => select(spk.display_name ?? "")}
                          className={`flex-1 min-w-0 cursor-pointer truncate text-left text-sm ${
                            isSelected
                              ? "font-semibold text-orange-600 dark:text-orange-400"
                              : "text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          <span>{spk.display_name}</span>
                          {spk.speaker_label && spk.speaker_label !== spk.display_name && (
                            <span className="ml-1.5 text-[10px] text-zinc-400 dark:text-zinc-500">({spk.speaker_label})</span>
                          )}
                        </button>
                      )}

                      {!isEditing && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); startEditing(spk); }}
                          className="flex-shrink-0 rounded p-1 text-zinc-300 opacity-0 transition-all hover:bg-zinc-100 hover:text-zinc-500 group-hover:opacity-100 dark:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-400"
                          title="Rename speaker"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                            <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
                            <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                {filtered.length === 0 && (
                  <p className="px-3 py-3 text-center text-xs text-zinc-400">No matches found</p>
                )}
                {filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => select(opt)}
                    className={`w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10 ${
                      value === opt
                        ? "bg-orange-50 font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                        : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
