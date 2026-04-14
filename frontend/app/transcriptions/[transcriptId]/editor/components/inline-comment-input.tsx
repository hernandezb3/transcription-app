"use client";

import { useState, useEffect, useRef } from "react";
import MentionTextarea from "./mention-textarea";

export default function InlineCommentInput({
  transcriptId,
  sectionId,
  onCommentAdded,
  autoFocus = false,
}: {
  transcriptId: string;
  sectionId: number;
  onCommentAdded: () => void;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) {
      // Small delay to let the DOM settle after expand animation
      const timer = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (!value.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/transcriptions/${transcriptId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId, comment: value.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create comment");
      setValue("");
      onCommentAdded();
    } catch {
      alert("Failed to post comment – please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <MentionTextarea
        ref={textareaRef}
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        placeholder="Add a comment…"
        disabled={submitting}
        rows={1}
        minHeight="28px"
        maxHeight="80px"
        className="flex-1"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!value.trim() || submitting}
        className="cursor-pointer flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-sm shadow-sky-500/20 transition hover:shadow-sky-500/40 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Post comment"
      >
        {submitting ? (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
            <path d="M2.87 2.298a.75.75 0 0 0-.812 1.021L3.39 6.624a1 1 0 0 0 .928.626H8.25a.75.75 0 0 1 0 1.5H4.318a1 1 0 0 0-.927.626l-1.333 3.305a.75.75 0 0 0 .812 1.021l11.07-3.548a.75.75 0 0 0 0-1.408L2.87 2.298Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
