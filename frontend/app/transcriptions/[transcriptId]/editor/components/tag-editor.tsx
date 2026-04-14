"use client";

import { useState, type KeyboardEvent } from "react";
import HighlightText from "./highlight-text";

export default function TagEditor({
  tags,
  onAdd,
  onRemove,
  highlight = "",
  matchOffset = 0,
  activeMatchIndex = -1,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  highlight?: string;
  matchOffset?: number;
  activeMatchIndex?: number;
}) {
  const [input, setInput] = useState("");

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      const tag = input.trim().toLowerCase();
      if (!tags.includes(tag)) onAdd(tag);
      setInput("");
    }
  };

  // Compute per-tag offsets
  const tagOffsets: number[] = [];
  let runningOffset = matchOffset;
  for (const tag of tags) {
    tagOffsets.push(runningOffset);
    if (highlight) {
      const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matches = tag.match(new RegExp(escaped, "gi"));
      runningOffset += matches ? matches.length : 0;
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag, i) => (
        <span
          key={tag}
          className="group/tag inline-flex cursor-pointer items-center gap-1 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm transition-all hover:shadow dark:from-orange-500/15 dark:to-amber-500/15 dark:text-orange-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 opacity-50">
            <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <HighlightText text={tag} query={highlight} matchOffset={tagOffsets[i]} activeMatchIndex={activeMatchIndex} />
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="ml-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-orange-400 opacity-0 transition-all hover:bg-orange-200 hover:text-orange-700 group-hover/tag:opacity-100 dark:hover:bg-orange-500/30 dark:hover:text-orange-200"
            aria-label={`Remove tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder="+ Add tag…"
        className="w-28 cursor-pointer rounded-full border border-dashed border-zinc-300 bg-transparent px-3 py-1 text-xs font-medium placeholder:text-zinc-400 transition hover:border-orange-300 hover:bg-orange-50 focus:cursor-text focus:border-orange-400 focus:bg-transparent focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-zinc-600 dark:hover:border-orange-500/30 dark:hover:bg-orange-500/5 dark:focus:ring-orange-500/20"
      />
    </div>
  );
}
