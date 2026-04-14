"use client";

export default function HighlightText({
  text,
  query,
  matchOffset = 0,
  activeMatchIndex = -1,
}: {
  text: string;
  query: string;
  matchOffset?: number;
  activeMatchIndex?: number;
}) {
  if (!query) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  let matchCounter = matchOffset;
  return (
    <>
      {parts.map((part, i) => {
        if (regex.test(part)) {
          const idx = matchCounter++;
          const isActive = idx === activeMatchIndex;
          return (
            <mark
              key={i}
              data-search-match={idx}
              className={`rounded-sm px-0.5 transition-colors ${
                isActive
                  ? "bg-orange-400 text-white ring-2 ring-orange-400/50 dark:bg-orange-500 dark:ring-orange-500/50"
                  : "bg-amber-200 text-amber-900 dark:bg-amber-500/30 dark:text-amber-200"
              }`}
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
