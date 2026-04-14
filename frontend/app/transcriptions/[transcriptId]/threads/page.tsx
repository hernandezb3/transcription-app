"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MentionTextarea from "../editor/components/mention-textarea";
import MentionText from "@/app/components/mention-text";

/* ── Types ── */

interface ThreadItem {
  id: number;
  transcription_id: number;
  title: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string | null;
  post_count: number;
  latest_post_at: string | null;
}

interface PostItem {
  id: number;
  thread_id: number;
  parent_post_id: number | null;
  body: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string | null;
  edited_at: string | null;
}

/* ── Helpers ── */

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const utcStr = /[Z+-]\d{0,4}$/.test(dateStr) ? dateStr : dateStr + "Z";
  const diff = Date.now() - new Date(utcStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(/[\s_-]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "from-orange-400 to-amber-400",
  "from-sky-400 to-indigo-400",
  "from-emerald-400 to-teal-400",
  "from-violet-400 to-purple-400",
  "from-pink-400 to-rose-400",
  "from-cyan-400 to-blue-400",
];

function avatarColor(id: number | null) {
  return AVATAR_COLORS[(id ?? 0) % AVATAR_COLORS.length];
}

/* ── Emoji shortcodes ── */

const EMOJI_MAP: Record<string, string> = {
  ":)": "😊", ":-)": "😊", ":(": "😞", ":-(": "😞",
  ":D": "😃", ":-D": "😃", ";)": "😉", ";-)": "😉",
  ":P": "😛", ":-P": "😛", "<3": "❤️", ":fire:": "🔥",
  ":+1:": "👍", ":-1:": "👎", ":wave:": "👋", ":clap:": "👏",
  ":star:": "⭐", ":check:": "✅", ":x:": "❌", ":warning:": "⚠️",
  ":bulb:": "💡", ":rocket:": "🚀", ":eyes:": "👀", ":100:": "💯",
  ":thinking:": "🤔", ":thumbsup:": "👍", ":thumbsdown:": "👎",
  ":heart:": "❤️", ":laugh:": "😂", ":sad:": "😢", ":party:": "🎉",
  ":mic:": "🎤", ":note:": "📝", ":pin:": "📌", ":link:": "🔗",
  ":question:": "❓", ":exclamation:": "❗", ":ok:": "👌",
};

const EMOJI_QUICK_PICKS = ["😊", "👍", "❤️", "🔥", "🎉", "👀", "✅", "🚀", "💡", "🤔", "😂", "📝"];

function replaceEmojis(text: string): string {
  let result = text;
  for (const [code, emoji] of Object.entries(EMOJI_MAP)) {
    // Escape special regex chars in the shortcode
    const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), emoji);
  }
  return result;
}

/* ── Inline formatting parser (bold, italic, strikethrough, code, emoji, @mentions) ── */

function parseInline(text: string): React.ReactNode[] {
  const withEmoji = replaceEmojis(text);
  // Match: `code`, **bold**, *italic*, ~~strike~~, @mention
  const re = /(`[^`\n]+`)|(\*\*(?:(?!\*\*)[\s\S])+?\*\*)|(\*(?!\*| )(?:(?!\*)[\s\S])+?\*(?!\*))|(~~(?:(?!~~)[\s\S])+?~~)|(@[\w.\-]+)/g;
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(withEmoji)) !== null) {
    if (m.index > lastIndex) result.push(<span key={key++}>{withEmoji.slice(lastIndex, m.index)}</span>);
    const full = m[0];
    if (m[1]) {
      // inline code
      result.push(
        <code key={key++} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[13px] font-mono text-pink-600 dark:bg-zinc-800 dark:text-pink-400">
          {full.slice(1, -1)}
        </code>
      );
    } else if (m[2]) {
      // bold
      result.push(<strong key={key++} className="font-semibold">{parseInline(full.slice(2, -2))}</strong>);
    } else if (m[3]) {
      // italic
      result.push(<em key={key++}>{parseInline(full.slice(1, -1))}</em>);
    } else if (m[4]) {
      // strikethrough
      result.push(<s key={key++} className="text-zinc-400 line-through">{parseInline(full.slice(2, -2))}</s>);
    } else if (m[5]) {
      // @mention
      result.push(
        <span key={key++} className="inline-flex items-center rounded bg-sky-100 px-1 text-sky-700 font-medium dark:bg-sky-500/15 dark:text-sky-300">
          {full}
        </span>
      );
    }
    lastIndex = m.index + full.length;
  }
  if (lastIndex < withEmoji.length) result.push(<span key={key++}>{withEmoji.slice(lastIndex)}</span>);
  return result.length > 0 ? result : [<span key={0}>{withEmoji}</span>];
}

/* ── Block + inline body renderer ── */

function RenderBody({ body }: { body: string }) {
  // Extract fenced code blocks first
  const cbRe = /```(\w*)\n?([\s\S]*?)```/g;
  const segs: { kind: "text" | "code"; content: string; lang?: string }[] = [];
  let last = 0;
  let cm: RegExpExecArray | null;
  while ((cm = cbRe.exec(body)) !== null) {
    if (cm.index > last) segs.push({ kind: "text", content: body.slice(last, cm.index) });
    segs.push({ kind: "code", content: cm[2], lang: cm[1] || undefined });
    last = cm.index + cm[0].length;
  }
  if (last < body.length) segs.push({ kind: "text", content: body.slice(last) });

  return (
    <div className="space-y-1 mt-0.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
      {segs.map((seg, si) => {
        if (seg.kind === "code") {
          return (
            <pre key={si} className="my-1 overflow-x-auto rounded-md bg-zinc-100 p-3 text-[13px] dark:bg-zinc-800">
              {seg.lang && <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{seg.lang}</div>}
              <code className="font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{seg.content}</code>
            </pre>
          );
        }
        const lines = seg.content.split("\n");
        const blocks: React.ReactNode[] = [];
        let bk = 0, i = 0;
        while (i < lines.length) {
          const t = lines[i].trimStart();
          // Heading
          if (/^#{1,3}\s/.test(t)) {
            const lvl = t.match(/^(#{1,3})\s/)![1].length;
            const txt = t.replace(/^#{1,3}\s/, "");
            const cls = lvl === 1 ? "text-base font-bold" : lvl === 2 ? "text-sm font-semibold" : "text-sm font-medium";
            blocks.push(<div key={bk++} className={`${cls} text-zinc-800 dark:text-zinc-100`}>{parseInline(txt)}</div>);
            i++; continue;
          }
          // Horizontal rule
          if (/^---+$/.test(t)) { blocks.push(<hr key={bk++} className="my-2 border-zinc-200 dark:border-zinc-700" />); i++; continue; }
          // Blockquote
          if (/^>\s?/.test(t)) {
            const q: string[] = [];
            while (i < lines.length && /^>\s?/.test(lines[i].trimStart())) { q.push(lines[i].trimStart().replace(/^>\s?/, "")); i++; }
            blocks.push(
              <blockquote key={bk++} className="my-1 border-l-2 border-indigo-400 pl-3 italic text-zinc-500 dark:text-zinc-400">
                {q.map((l, li) => <div key={li}>{parseInline(l)}</div>)}
              </blockquote>
            ); continue;
          }
          // Unordered list
          if (/^[-*]\s/.test(t)) {
            const items: string[] = [];
            while (i < lines.length && /^[-*]\s/.test(lines[i].trimStart())) { items.push(lines[i].trimStart().replace(/^[-*]\s/, "")); i++; }
            blocks.push(
              <ul key={bk++} className="my-0.5 ml-4 list-disc space-y-0.5">
                {items.map((it, ii) => <li key={ii}>{parseInline(it)}</li>)}
              </ul>
            ); continue;
          }
          // Ordered list
          if (/^\d+\.\s/.test(t)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s/.test(lines[i].trimStart())) { items.push(lines[i].trimStart().replace(/^\d+\.\s/, "")); i++; }
            blocks.push(
              <ol key={bk++} className="my-0.5 ml-4 list-decimal space-y-0.5">
                {items.map((it, ii) => <li key={ii}>{parseInline(it)}</li>)}
              </ol>
            ); continue;
          }
          // Blank
          if (!t) { i++; continue; }
          // Paragraph
          const paraLines: string[] = [];
          while (i < lines.length) {
            const lt = lines[i].trimStart();
            if (!lt) break;
            if (/^#{1,3}\s/.test(lt) || /^---+$/.test(lt) || /^>\s?/.test(lt) || /^[-*]\s/.test(lt) || /^\d+\.\s/.test(lt)) break;
            paraLines.push(lines[i]);
            i++;
          }
          if (paraLines.length > 0) {
            blocks.push(<div key={bk++} className="whitespace-pre-wrap">{parseInline(paraLines.join("\n"))}</div>);
          }
        }
        return <div key={si}>{blocks}</div>;
      })}
    </div>
  );
}

/* ── Formatting toolbar ── */

function FmtBtn({ title, onAction, children }: { title: string; onAction: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onAction(); }}
      className="flex h-7 min-w-[28px] cursor-pointer items-center justify-center rounded px-1.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
    >
      {children}
    </button>
  );
}

function FmtSep() {
  return <div className="mx-0.5 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />;
}

/** Wraps the selection (or inserts at cursor) in a textarea with the given prefix/suffix */
function wrapSelection(textarea: HTMLTextAreaElement, prefix: string, suffix: string, setValue: (v: string) => void) {
  const { selectionStart: s, selectionEnd: e, value } = textarea;
  const selected = value.slice(s, e);
  const before = value.slice(0, s);
  const after = value.slice(e);
  const newVal = before + prefix + selected + suffix + after;
  setValue(newVal);
  // Restore cursor after React re-render
  requestAnimationFrame(() => {
    textarea.focus();
    if (selected) {
      textarea.setSelectionRange(s + prefix.length, e + prefix.length);
    } else {
      const cur = s + prefix.length;
      textarea.setSelectionRange(cur, cur);
    }
  });
}

function insertAtCursor(textarea: HTMLTextAreaElement, text: string, setValue: (v: string) => void) {
  const { selectionStart: s, value } = textarea;
  const newVal = value.slice(0, s) + text + value.slice(s);
  setValue(newVal);
  requestAnimationFrame(() => {
    textarea.focus();
    const cur = s + text.length;
    textarea.setSelectionRange(cur, cur);
  });
}

function FormatToolbar({
  textareaRef,
  setValue,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  setValue: (v: string) => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    if (showEmoji) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmoji]);

  const wrap = (pre: string, suf: string) => {
    if (textareaRef.current) wrapSelection(textareaRef.current, pre, suf, setValue);
  };
  const insert = (txt: string) => {
    if (textareaRef.current) insertAtCursor(textareaRef.current, txt, setValue);
  };

  return (
    <div className="flex items-center gap-0.5 border-b border-zinc-100 pb-1.5 mb-1.5 dark:border-zinc-800 overflow-x-auto [scrollbar-width:thin]">
      <FmtBtn title="Bold  **text**" onAction={() => wrap("**", "**")}><span className="font-bold">B</span></FmtBtn>
      <FmtBtn title="Italic  *text*" onAction={() => wrap("*", "*")}><span className="italic">I</span></FmtBtn>
      <FmtBtn title="Strikethrough  ~~text~~" onAction={() => wrap("~~", "~~")}><span className="line-through">S</span></FmtBtn>
      <FmtBtn title="Inline code  `code`" onAction={() => wrap("`", "`")}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path fillRule="evenodd" d="M2.672 2.586a.75.75 0 0 1 .985.392l4 10a.75.75 0 0 1-1.392.557l-.632-1.58H4.42l-.948-.001-.631 1.58a.75.75 0 1 1-1.392-.556l4-10a.75.75 0 0 1 .392-.392ZM10 5.5a.75.75 0 0 1 .62.33l2.5 3.667a.75.75 0 0 1 0 .836l-2.5 3.667a.75.75 0 0 1-1.24-.844L11.68 10l-2.3-3.156A.75.75 0 0 1 10 5.5Z" clipRule="evenodd" />
        </svg>
      </FmtBtn>
      <FmtSep />
      <FmtBtn title="Code block" onAction={() => wrap("```\n", "\n```")}>
        <span className="text-[10px] font-mono font-bold">{"{}"}</span>
      </FmtBtn>
      <FmtBtn title="Quote  > text" onAction={() => insert("\n> ")}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm3 3A.75.75 0 0 1 5.75 7h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 5 7.75Zm0 3a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>
      </FmtBtn>
      <FmtBtn title="Bullet list" onAction={() => insert("\n- ")}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path fillRule="evenodd" d="M2.5 4a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0ZM4 4a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5A.75.75 0 0 1 4 4Zm.75 3.25a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5h-9.5ZM4 12a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5A.75.75 0 0 1 4 12ZM2.5 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm-.5 3.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z" clipRule="evenodd" />
        </svg>
      </FmtBtn>
      <FmtBtn title="Numbered list" onAction={() => insert("\n1. ")}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path fillRule="evenodd" d="M2 3.5A.5.5 0 0 1 2.5 3h.382a.5.5 0 0 1 .447.276L4 4.618l.671-1.342A.5.5 0 0 1 5.118 3H5.5a.5.5 0 0 1 0 1H5.3l-.5 1H5.5a.5.5 0 0 1 0 1H4.2l-.5 1H5.5a.5.5 0 0 1 0 1H3.1l-.5 1H5.5a.5.5 0 0 1 0 1H2.5a.5.5 0 0 1 0-1h.382ZM7 4a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 7 4Zm.75 3.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5ZM7 12a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 7 12Z" clipRule="evenodd" />
        </svg>
      </FmtBtn>
      <FmtSep />
      <FmtBtn title="Heading" onAction={() => insert("\n## ")}>
        <span className="text-[10px] font-bold">H</span>
      </FmtBtn>
      <FmtBtn title="Horizontal rule" onAction={() => insert("\n---\n")}>
        <span className="text-[10px] font-bold">—</span>
      </FmtBtn>
      <FmtSep />
      {/* Emoji picker */}
      <div className="relative" ref={emojiRef}>
        <FmtBtn title="Emoji" onAction={() => setShowEmoji((v) => !v)}>
          <span className="text-sm">😊</span>
        </FmtBtn>
        {showEmoji && (
          <div className="absolute left-0 bottom-full mb-1 z-50 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <div className="grid grid-cols-6 gap-1">
              {EMOJI_QUICK_PICKS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => { insert(emoji); setShowEmoji(false); }}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-lg transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <p className="mt-1.5 border-t border-zinc-100 pt-1.5 text-[9px] text-zinc-400 dark:border-zinc-800">
              Tip: type <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">:fire:</code> <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">:+1:</code> etc.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Thread Detail — shows all posts in a thread                        */
/* ================================================================== */

function ThreadDetail({
  transcriptId,
  thread,
  onBack,
}: {
  transcriptId: string;
  thread: ThreadItem;
  onBack: () => void;
}) {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBody, setNewBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<PostItem | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/transcripts/${transcriptId}/threads/${thread.id}/posts`
      );
      if (!res.ok) return;
      setPosts(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [transcriptId, thread.id]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  // Scroll to bottom when new posts arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [posts.length]);

  const addPost = async () => {
    if (!newBody.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(
        `/api/transcripts/${transcriptId}/threads/${thread.id}/posts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: newBody.trim(),
            parent_post_id: replyTo?.id ?? null,
          }),
        }
      );
      if (res.ok) {
        setPosts(await res.json());
        setNewBody("");
        setReplyTo(null);
        inputRef.current?.focus();
      }
    } catch {
      /* ignore */
    } finally {
      setPosting(false);
    }
  };

  const saveEdit = async (postId: number) => {
    if (!editingBody.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/transcripts/${transcriptId}/threads/${thread.id}/posts/${postId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: editingBody.trim() }),
        }
      );
      if (res.ok) setPosts(await res.json());
    } catch {
      /* ignore */
    } finally {
      setEditingId(null);
    }
  };

  const deletePost = async (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      const res = await fetch(
        `/api/transcripts/${transcriptId}/threads/${thread.id}/posts/${postId}`,
        { method: "DELETE" }
      );
      if (res.ok) setPosts(await res.json());
    } catch {
      fetchPosts();
    }
  };

  // Build a lookup of parent replies
  const postsById = new Map(posts.map((p) => [p.id, p]));

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Thread header */}
      <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Back to threads"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25h8.69A.75.75 0 0 1 14 8Z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
              {thread.title}
            </h2>
            <p className="text-[10px] text-zinc-400">
              Started by {thread.created_by_name ?? "Unknown"} · {relativeTime(thread.created_at)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 ring-1 ring-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20">
            {posts.length} {posts.length === 1 ? "post" : "posts"}
          </span>
        </div>
      </div>

      {/* Posts list */}
      <div className="max-h-[28rem] overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/50">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          </div>
        )}

        {!loading && posts.length === 0 && (
          <p className="px-5 py-8 text-center text-xs text-zinc-400">
            No posts yet — be the first to reply!
          </p>
        )}

        {posts.map((post) => {
          const parentPost = post.parent_post_id ? postsById.get(post.parent_post_id) : null;

          return (
            <div key={post.id} className="group px-5 py-3">
              {/* Reply indicator */}
              {parentPost && (
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-zinc-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 rotate-180">
                    <path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25h8.69A.75.75 0 0 1 14 8Z" clipRule="evenodd" />
                  </svg>
                  <span className="italic truncate max-w-xs">
                    Replying to {parentPost.created_by_name ?? "Unknown"}: &quot;{replaceEmojis(parentPost.body.slice(0, 50))}{parentPost.body.length > 50 ? "…" : ""}&quot;
                  </span>
                </div>
              )}

              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white shadow-sm ${avatarColor(post.created_by)}`}
                >
                  {getInitials(post.created_by_name)}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Author + time */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {post.created_by_name ?? "Unknown"}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {relativeTime(post.created_at)}
                    </span>
                    {post.edited_at && (
                      <span className="text-[10px] italic text-zinc-400">(edited)</span>
                    )}
                  </div>

                  {/* Body or edit field */}
                  {editingId === post.id ? (
                    <div className="mt-1">
                      <FormatToolbar textareaRef={editRef} setValue={setEditingBody} />
                      <textarea
                        ref={editRef}
                        value={editingBody}
                        onChange={(e) => setEditingBody(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            saveEdit(post.id);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        rows={3}
                        className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none ring-2 ring-indigo-200 dark:border-indigo-500/50 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-indigo-500/20 resize-none"
                      />
                    </div>
                  ) : (
                    <RenderBody body={post.body} />
                  )}

                  {/* Actions */}
                  {editingId !== post.id && (
                    <div className="mt-1 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTo(post);
                          inputRef.current?.focus();
                        }}
                        className="cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      >
                        Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(post.id);
                          setEditingBody(post.body);
                        }}
                        className="cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePost(post.id)}
                        className="cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Compose area */}
      <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 rotate-180 flex-shrink-0">
              <path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25h8.69A.75.75 0 0 1 14 8Z" clipRule="evenodd" />
            </svg>
            <span className="truncate flex-1">
              Replying to <strong>{replyTo.created_by_name ?? "Unknown"}</strong>
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="cursor-pointer flex-shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        )}
        <FormatToolbar textareaRef={inputRef} setValue={setNewBody} />
        <div className="flex items-end gap-2">
          <MentionTextarea
            ref={inputRef}
            value={newBody}
            onChange={setNewBody}
            onSubmit={addPost}
            placeholder="Write a reply… (type @ to mention)"
            rows={2}
            minHeight="44px"
            maxHeight="120px"
            className="flex-1"
            disabled={posting}
          />
          <button
            type="button"
            onClick={addPost}
            disabled={!newBody.trim() || posting}
            className="cursor-pointer flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/20 transition hover:shadow-indigo-500/40 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send"
          >
            {posting ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path d="M2.87 2.298a.75.75 0 0 0-.812 1.021L3.39 6.624a1 1 0 0 0 .928.626H8.25a.75.75 0 0 1 0 1.5H4.318a1 1 0 0 0-.927.626l-1.333 3.305a.75.75 0 0 0 .812 1.021l11.07-3.548a.75.75 0 0 0 0-1.408L2.87 2.298Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Thread List — shows all threads for a transcript                   */
/* ================================================================== */

function ThreadList({
  transcriptId,
  onSelectThread,
}: {
  transcriptId: string;
  onSelectThread: (thread: ThreadItem) => void;
}) {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/threads`);
      if (!res.ok) return;
      setThreads(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [transcriptId]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const createThread = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        setThreads(await res.json());
        setNewTitle("");
      }
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  };

  const deleteThread = async (threadId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    try {
      const res = await fetch(
        `/api/transcripts/${transcriptId}/threads/${threadId}`,
        { method: "DELETE" }
      );
      if (res.ok) setThreads(await res.json());
    } catch {
      fetchThreads();
    }
  };

  const filtered = threads.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.created_by_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-indigo-500">
              <path d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317.713 2.435 0 3.277 0 4.26v4.48Z" />
            </svg>
            Discussion Threads
            {threads.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-indigo-50 px-1.5 text-[10px] font-semibold text-indigo-600 ring-1 ring-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20">
                {threads.length}
              </span>
            )}
          </h2>
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400">
              <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-28 rounded-md border border-zinc-200 bg-zinc-50 py-1 pl-7 pr-2 text-[11px] placeholder:text-zinc-400 transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-800 dark:placeholder:text-zinc-500 dark:focus:border-indigo-500/50 dark:focus:bg-zinc-900"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/50">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          </div>
        )}

        {!loading && filtered.length === 0 && !newTitle && (
          <p className="px-5 py-8 text-center text-xs text-zinc-400">
            No threads yet — start a discussion below.
          </p>
        )}

        {filtered.map((thread) => (
          <div
            key={thread.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectThread(thread)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectThread(thread); }}
            className="group flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
          >
            {/* Thread icon */}
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75ZM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Zm0 4.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                <MentionText text={thread.title} highlight={search} />
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-400">
                <span>{thread.created_by_name ?? "Unknown"}</span>
                <span>·</span>
                <span>{relativeTime(thread.created_at)}</span>
                <span>·</span>
                <span className="font-medium text-indigo-500">
                  {thread.post_count} {thread.post_count === 1 ? "reply" : "replies"}
                </span>
                {thread.latest_post_at && (
                  <>
                    <span>·</span>
                    <span>Last reply {relativeTime(thread.latest_post_at)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Delete button */}
            <button
              type="button"
              onClick={(e) => deleteThread(thread.id, e)}
              className="cursor-pointer mt-1 flex-shrink-0 rounded-lg p-1 text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              aria-label="Delete thread"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Create new thread */}
      <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400">
              <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
            </svg>
            <MentionTextarea
              value={newTitle}
              onChange={setNewTitle}
              onSubmit={createThread}
              placeholder="Start a new discussion… (type @ to mention)"
              rows={1}
              minHeight="34px"
              maxHeight="80px"
            />
          </div>
          <button
            type="button"
            onClick={createThread}
            disabled={!newTitle.trim() || creating}
            className="cursor-pointer flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-500/20 transition hover:shadow-indigo-500/40 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Create thread"
          >
            {creating ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page: Transcript Threads                                           */
/* ================================================================== */

export default function TranscriptThreadsPage() {
  const params = useParams<{ transcriptId: string }>();
  const transcriptId = params.transcriptId;
  const [selectedThread, setSelectedThread] = useState<ThreadItem | null>(null);

  return (
    <section className="space-y-6">
      {/* Back to overview */}
      <div className="flex items-center gap-3">
        <Link
          href={`/transcriptions/${transcriptId}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H4.56l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 1.06L4.56 7.25h8.69A.75.75 0 0 1 14 8Z" clipRule="evenodd" />
          </svg>
          Back to Overview
        </Link>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Threads</h1>
      </div>

      {selectedThread ? (
        <ThreadDetail
          transcriptId={transcriptId}
          thread={selectedThread}
          onBack={() => setSelectedThread(null)}
        />
      ) : (
        <ThreadList
          transcriptId={transcriptId}
          onSelectThread={setSelectedThread}
        />
      )}
    </section>
  );
}
