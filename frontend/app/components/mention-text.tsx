"use client";

import React from "react";

/** Highlight every occurrence of `query` inside `text` with an amber mark. */
function highlightQuery(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-amber-200/80 text-amber-900 rounded-sm px-0.5 dark:bg-amber-500/30 dark:text-amber-200">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/**
 * Renders text with @mentions highlighted.
 * `@username` tokens are wrapped in a styled <span>.
 * If `highlight` is provided, matching substrings are wrapped in <mark>.
 */
export default function MentionText({ text, highlight }: { text: string | null; highlight?: string }) {
  if (!text) return null;

  const parts = text.split(/(@[\w.\-]+)/g);

  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span
            key={i}
            className="inline-flex items-center rounded bg-sky-100 px-1 text-sky-700 font-medium dark:bg-sky-500/15 dark:text-sky-300"
          >
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{highlight ? highlightQuery(part, highlight) : part}</React.Fragment>
        ),
      )}
    </>
  );
}
