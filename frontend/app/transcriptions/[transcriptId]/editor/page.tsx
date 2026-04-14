"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

import type { TranscriptSection, TranscriptSpeaker, TranscriptComment, ActivityLogEntry, RecentEdit } from "./lib/types";
import {
  timestampToSeconds,
  formatTimestamp,
  formatSecondsToTime,
  countOccurrences,
  downloadFile,
  SPEAKER_COLORS,
  getSpeakerColor as _getSpeakerColor,
  getSpeakerInitials,
} from "./lib/helpers";

import InlineEdit from "./components/inline-edit";
import TagEditor from "./components/tag-editor";
import PlayIcon from "./components/play-icon";
import SearchSelect from "./components/search-select";
import DiffModal from "./components/diff-modal";
import EditorActivity from "./components/editor-activity";
import CommentsPanel from "./components/comments-panel";

/* ================================================================== */
/*  Main page component                                                */
/* ================================================================== */

export default function TranscriptEditorPage() {
  const params = useParams<{ transcriptId: string }>();
  const transcriptId = params.transcriptId;

  /* ---------- Core state ---------- */

  const [sections, setSections] = useState<TranscriptSection[]>([]);
  const [speakers, setSpeakers] = useState<TranscriptSpeaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [addingSectionAtPosition, setAddingSectionAtPosition] = useState<number | null>(null);

  /* ---------- Audio player state ---------- */

  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerTime, setPlayerTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  /* ---------- Filter / search / UI state ---------- */

  const [filterSpeaker, setFilterSpeaker] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [diffSectionId, setDiffSectionId] = useState<number | null>(null);
  const [comments, setComments] = useState<TranscriptComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [sidebarPanel, setSidebarPanel] = useState<{ sectionId: number; panel: "notes" | "tags" | "edits" } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const notesListRef = useRef<HTMLDivElement>(null);
  const [showEditorActivity, setShowEditorActivity] = useState(true);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [recentEdits, setRecentEdits] = useState<RecentEdit[]>([]);
  const [loadingRecentEdits, setLoadingRecentEdits] = useState(false);

  const previousNotesCountRef = useRef(0);
  const [showComments, setShowComments] = useState(true);
  const [commentsCollapsed, setCommentsCollapsed] = useState(true);
  const [activityCollapsed, setActivityCollapsed] = useState(true);
  const [activeCommentSectionId, setActiveCommentSectionId] = useState<number | null>(null);
  const [expandedCommentSections, setExpandedCommentSections] = useState<Set<number>>(new Set());
  const sectionCardRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  const activeSidebarSection = sidebarPanel ? sections.find((s) => s.id === sidebarPanel.sectionId) : null;
  const activeNotesCount = sidebarPanel?.panel === "notes" && activeSidebarSection
    ? comments.filter((c) => c.section_id === activeSidebarSection.section_id).length
    : 0;

  /* ---------- Derived data ---------- */

  const uniqueSpeakers = speakers
    .filter((s) => s.is_active === 1 && s.display_name)
    .map((s) => s.display_name as string);
  const allTags = Array.from(new Set(sections.flatMap((s) => s.tags)));

  const filteredSections = sections.filter((s) => {
    const displayName = getSpeakerDisplayName(s);
    if (filterSpeaker && displayName !== filterSpeaker) return false;
    if (filterTag && !s.tags.includes(filterTag)) return false;
    return true;
  });

  /* ---------- Speaker helpers (use extracted fn with local uniqueSpeakers) ---------- */

  const getSpeakerColor = (speaker: string | null) => _getSpeakerColor(speaker, uniqueSpeakers);

  /* ---------- Close export dropdown on outside click ---------- */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ---------- Fetch comments ---------- */

  const fetchComments = useCallback(async (silent = false) => {
    if (!silent) setLoadingComments(true);
    try {
      const res = await fetch(`/api/transcriptions/${transcriptId}/comments`);
      if (!res.ok) throw new Error("Failed to load comments");
      const data: TranscriptComment[] = await res.json();
      setComments(data);
    } catch {
      /* silently ignore – comments are non-critical */
    } finally {
      if (!silent) setLoadingComments(false);
    }
  }, [transcriptId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  /* ---------- Fetch editor activity ---------- */

  const fetchActivity = useCallback(async (silent = false) => {
    if (!silent) setLoadingActivity(true);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/overview`);
      if (!res.ok) throw new Error("Failed to load activity");
      const data = await res.json();
      setActivityLog(data.recent_activity ?? []);
    } catch {
      /* silently ignore */
    } finally {
      setLoadingActivity(false);
    }
  }, [transcriptId]);

  useEffect(() => {
    if (showEditorActivity) {
      fetchActivity();
      fetchRecentEdits();
    }
  }, [showEditorActivity, fetchActivity]);

  /* ---------- Fetch recent edits ---------- */

  const fetchRecentEdits = useCallback(async (silent = false) => {
    if (!silent) setLoadingRecentEdits(true);
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}/recent-edits`);
      if (!res.ok) throw new Error("Failed to load recent edits");
      const data: RecentEdit[] = await res.json();
      setRecentEdits(data);
    } catch {
      /* silently ignore */
    } finally {
      setLoadingRecentEdits(false);
    }
  }, [transcriptId]);

  /* ---------- Jump to a section by its DB id ---------- */

  const jumpToSection = useCallback((sectionDbId: number) => {
    if (!sectionListRef.current) return;
    const el = sectionListRef.current.querySelector(`[data-section-id="${sectionDbId}"]`) as HTMLElement | null;
    if (el) {
      const container = sectionListRef.current;
      const elTop = el.offsetTop - container.offsetTop;
      container.scrollTo({ top: elTop - 8, behavior: "smooth" });
      // Brief highlight effect on the card box itself
      const card = el.querySelector("[data-section-card]") as HTMLElement | null;
      if (card) {
        card.classList.add("ring-2", "ring-amber-400");
        setTimeout(() => card.classList.remove("ring-2", "ring-amber-400"), 2000);
      }
    }
  }, []);

  // Keep notes popout pinned to latest comment when opened or when a new comment arrives
  useEffect(() => {
    if (sidebarPanel?.panel !== "notes") {
      previousNotesCountRef.current = 0;
      return;
    }
    const shouldScroll =
      previousNotesCountRef.current === 0 || activeNotesCount > previousNotesCountRef.current;
    previousNotesCountRef.current = activeNotesCount;
    if (!shouldScroll) return;
    requestAnimationFrame(() => {
      if (!notesListRef.current) return;
      notesListRef.current.scrollTop = notesListRef.current.scrollHeight;
    });
  }, [sidebarPanel?.panel, sidebarPanel?.sectionId, activeNotesCount]);

  // Scroll to the active comment section card
  useEffect(() => {
    if (!showComments || activeCommentSectionId === null) return;
    const el = document.querySelector(`[data-comment-section-id="${activeCommentSectionId}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeCommentSectionId, showComments]);

  /* ---------- Fetch transcript sections ---------- */

  const fetchSpeakers = useCallback(async () => {
    try {
      const res = await fetch(`/api/transcriptions/${transcriptId}/speakers`);
      if (!res.ok) return;
      const data: TranscriptSpeaker[] = await res.json();
      setSpeakers(data);
    } catch {
      /* speakers are non-critical */
    }
  }, [transcriptId]);

  const fetchSections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transcriptions/${transcriptId}`);
      if (!res.ok) throw new Error(`Failed to load transcript (${res.status})`);
      const data: TranscriptSection[] = await res.json();
      setSections(
        [...data].sort((a, b) => (a.section_id ?? 0) - (b.section_id ?? 0))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [transcriptId]);

  useEffect(() => {
    fetchSections();
    fetchSpeakers();
    fetchRecentEdits(true); // pre-load count for badge
  }, [fetchSections, fetchSpeakers, fetchRecentEdits]);

  /* ---------- Helper: resolve speaker display name from speakers list ---------- */

  // eslint-disable-next-line react-hooks/exhaustive-deps
  function getSpeakerDisplayName(section: TranscriptSection): string | null {
    if (section.speaker_id == null) return section.speaker;
    const found = speakers.find((s) => s.id === section.speaker_id);
    return found?.display_name ?? section.speaker;
  }

  /* ---------- Persist a speaker rename (top-level, affects all sections) ---------- */

  const saveSpeakerName = async (speakerId: number, newName: string) => {
    setSavingId(speakerId);
    try {
      const res = await fetch(
        `/api/transcriptions/${transcriptId}/speakers/${speakerId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_name: newName }),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      setSpeakers((prev) =>
        prev.map((s) => (s.id === speakerId ? { ...s, display_name: newName } : s))
      );
      setSections((prev) =>
        prev.map((s) => (s.speaker_id === speakerId ? { ...s, speaker: newName } : s))
      );
    } catch {
      alert("Failed to save speaker name – please try again.");
    } finally {
      setSavingId(null);
    }
  };

  /* ---------- Persist a field change ---------- */

  const saveField = async (
    sectionDbId: number,
    field: "edited_text",
    value: string
  ) => {
    setSavingId(sectionDbId);
    try {
      const res = await fetch(`/api/transcriptions/sections/${sectionDbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSections((prev) =>
        prev.map((s) => (s.id === sectionDbId ? { ...s, [field]: value } : s))
      );
      // Refresh recent edits in background if panel is open
      if (showEditorActivity) fetchRecentEdits(true);
    } catch {
      alert("Failed to save – please try again.");
    } finally {
      setSavingId(null);
    }
  };

  const saveTags = async (sectionDbId: number, tags: string[]) => {
    setSavingId(sectionDbId);
    try {
      const res = await fetch(`/api/transcriptions/sections/${sectionDbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSections((prev) =>
        prev.map((s) => (s.id === sectionDbId ? { ...s, tags } : s))
      );
    } catch {
      alert("Failed to save – please try again.");
    } finally {
      setSavingId(null);
    }
  };

  /* ---------- Tag helpers ---------- */

  const handleAddTag = (sectionDbId: number, currentTags: string[], newTag: string) => {
    const updated = [...currentTags, newTag];
    saveTags(sectionDbId, updated);
  };

  const handleRemoveTag = (sectionDbId: number, currentTags: string[], removeTag: string) => {
    const updated = currentTags.filter((t) => t !== removeTag);
    saveTags(sectionDbId, updated);
  };

  /* ---------- Add / delete sections ---------- */

  const addSection = async (position?: number) => {
    setAddingSectionAtPosition(position ?? null);
    try {
      const payload: Record<string, unknown> = {};
      if (position !== undefined) payload.position = position;

      if (position !== undefined) {
        const sorted = [...sections].sort((a, b) => a.section_id - b.section_id);
        const prevSection = sorted.filter((s) => s.section_id < position).at(-1);
        const nextSection = sorted.find((s) => s.section_id >= position);
        if (prevSection?.end_timestamp) payload.begin_timestamp = prevSection.end_timestamp;
        if (nextSection?.begin_timestamp) payload.end_timestamp = nextSection.begin_timestamp;
      }

      const res = await fetch(`/api/transcriptions/${transcriptId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to add section");
      await fetchSections();
      await fetchSpeakers();
    } catch {
      alert("Failed to add section \u2013 please try again.");
    } finally {
      setAddingSectionAtPosition(null);
    }
  };

  const deleteSection = async (sectionDbId: number) => {
    if (!confirm("Delete this section? This cannot be undone.")) return;
    setSavingId(sectionDbId);
    try {
      const res = await fetch(`/api/transcriptions/sections/${sectionDbId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete section");
      await fetchSections();
    } catch {
      alert("Failed to delete section \u2013 please try again.");
    } finally {
      setSavingId(null);
    }
  };

  /* ---------- Global audio player ---------- */

  // Probe for an audio file once sections are loaded
  useEffect(() => {
    if (!transcriptId) return;
    fetch(`/api/transcripts/${transcriptId}/audio`, { method: "HEAD" }).then((r) => {
      if (r.ok) setHasAudio(true);
    }).catch(() => { /* no audio available */ });
  }, [transcriptId]);

  // Sync volume / mute / speed to the <audio> element
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // Total duration: prefer real audio duration, fall back to section timestamps
  const sectionDuration = sections.length > 0
    ? Math.max(...sections.map((s) => timestampToSeconds(s.end_timestamp)))
    : 0;
  const totalDuration = audioDuration > 0 ? audioDuration : sectionDuration;

  // Determine which section is active based on playerTime
  const activeSectionId = (() => {
    for (let i = sections.length - 1; i >= 0; i--) {
      const s = sections[i];
      if (playerTime >= timestampToSeconds(s.begin_timestamp) && playerTime < timestampToSeconds(s.end_timestamp)) {
        return s.id;
      }
    }
    return null;
  })();

  const activeSection = activeSectionId !== null ? sections.find((s) => s.id === activeSectionId) : null;

  // Keep a ref to the last known active section so we don't flash during gaps
  const lastActiveSectionRef = useRef<typeof activeSection>(null);
  if (activeSection) {
    lastActiveSectionRef.current = activeSection;
  }
  const displaySection = activeSection ?? lastActiveSectionRef.current;

  // Close speed menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setSpeedMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* --- playback helpers (audio-element driven) --- */

  const startPlayback = useCallback(() => {
    const a = audioRef.current;
    if (a && hasAudio) {
      a.play().catch(() => {});
    } else if (!hasAudio && sections.length > 0) {
      setIsPlaying(true);
    }
  }, [hasAudio, sections.length]);

  const pausePlayback = useCallback(() => {
    const a = audioRef.current;
    if (a) a.pause();
    setIsPlaying(false);
  }, []);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pausePlayback();
    } else {
      const a = audioRef.current;
      if (a && playerTime >= totalDuration && totalDuration > 0) {
        a.currentTime = 0;
        setPlayerTime(0);
      }
      startPlayback();
    }
  }, [isPlaying, playerTime, totalDuration, startPlayback, pausePlayback]);

  const seekTo = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, totalDuration || Infinity));
    setPlayerTime(clamped);
    const a = audioRef.current;
    if (a) a.currentTime = clamped;
  }, [totalDuration]);

  const handlePlay = (section: TranscriptSection) => {
    if (activeSectionId === section.id && isPlaying) {
      pausePlayback();
      return;
    }
    if (activeSectionId === section.id && !isPlaying) {
      startPlayback();
      return;
    }
    const startSec = timestampToSeconds(section.begin_timestamp);
    seekTo(startSec);
    setTimeout(() => startPlayback(), 50);
  };

  const sectionListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active section
  useEffect(() => {
    if (activeSectionId !== null && isPlaying && sectionListRef.current) {
      const el = sectionListRef.current.querySelector(`[data-section-id="${activeSectionId}"]`) as HTMLElement | null;
      if (el) {
        const container = sectionListRef.current;
        const elTop = el.offsetTop - container.offsetTop;
        container.scrollTo({ top: elTop - 8, behavior: "smooth" });
      }
    }
  }, [activeSectionId, isPlaying]);

  // Global keyboard shortcuts: Space = play/pause, Left/Right arrows = ±5s
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlayback();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seekTo(playerTime - 5);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seekTo(playerTime + 5);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlayback, seekTo, playerTime]);

  /* ---------- Search match count & per-section offsets ---------- */

  const sectionMatchOffsets = new Map<number, number>();
  let totalMatches = 0;
  if (searchQuery) {
    for (const s of filteredSections) {
      sectionMatchOffsets.set(s.id, totalMatches);
      totalMatches += countOccurrences(s.edited_text ?? s.original_text ?? "", searchQuery);
    }
  }

  // Reset match index when query or results change, and scroll to first match
  useEffect(() => {
    setSearchMatchIndex(0);
    if (searchQuery) {
      setTimeout(() => {
        const el = document.querySelector('[data-search-match="0"]');
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  }, [searchQuery, filterSpeaker, filterTag]);

  const scrollToMatch = useCallback((idx: number) => {
    setTimeout(() => {
      const el = document.querySelector(`[data-search-match="${idx}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, []);

  const goToNextMatch = useCallback(() => {
    if (totalMatches === 0) return;
    const next = (searchMatchIndex + 1) % totalMatches;
    setSearchMatchIndex(next);
    scrollToMatch(next);
  }, [totalMatches, searchMatchIndex, scrollToMatch]);

  const goToPrevMatch = useCallback(() => {
    if (totalMatches === 0) return;
    const prev = (searchMatchIndex - 1 + totalMatches) % totalMatches;
    setSearchMatchIndex(prev);
    scrollToMatch(prev);
  }, [totalMatches, searchMatchIndex, scrollToMatch]);

  /* ---------- Export helpers ---------- */

  const exportAsText = () => {
    const lines = sections.map((s) => {
      const speaker = getSpeakerDisplayName(s) ?? "Unknown";
      const time = `[${formatTimestamp(s.begin_timestamp)} → ${formatTimestamp(s.end_timestamp)}]`;
      const text = s.edited_text ?? s.original_text ?? "";
      const tagLine = s.tags.length > 0 ? `  Tags: ${s.tags.join(", ")}` : "";
      return `${speaker} ${time}\n${text}${tagLine ? "\n" + tagLine : ""}`;
    });
    const content = `Transcript #${transcriptId}\n${"=".repeat(40)}\n\n${lines.join("\n\n")}`;
    downloadFile(content, `transcript-${transcriptId}.txt`, "text/plain;charset=utf-8");
  };

  const exportAsJson = () => {
    const data = {
      transcriptId,
      exportedAt: new Date().toISOString(),
      sections: sections.map((s) => ({
        sectionId: s.section_id,
        speaker: getSpeakerDisplayName(s),
        speakerId: s.speaker_id,
        beginTimestamp: s.begin_timestamp,
        endTimestamp: s.end_timestamp,
        originalText: s.original_text,
        editedText: s.edited_text,
        tags: s.tags,
      })),
    };
    downloadFile(JSON.stringify(data, null, 2), `transcript-${transcriptId}.json`, "application/json");
  };

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  if (loading) {
    return (
      <section className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500 dark:border-orange-800 dark:border-t-orange-400" />
        </div>
        <p className="text-sm font-medium text-zinc-400 animate-pulse">Loading transcript…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex flex-col items-center justify-center gap-6 py-24">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-red-500">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{error}</p>
          <p className="mt-1 text-xs text-zinc-400">Something went wrong loading this transcript.</p>
        </div>
        <button
          onClick={fetchSections}
          className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:shadow-orange-500/40 hover:brightness-110 active:scale-[0.98]"
        >
          Try Again
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col h-[calc(100vh-5rem)] -m-6">
      {/* Hidden HTML5 audio element */}
      {hasAudio && (
        <audio
          ref={audioRef}
          src={`/api/transcripts/${transcriptId}/audio`}
          preload="auto"
          onLoadedMetadata={() => {
            const a = audioRef.current;
            if (a && a.duration && isFinite(a.duration)) setAudioDuration(a.duration);
          }}
          onTimeUpdate={() => {
            const a = audioRef.current;
            if (a) setPlayerTime(a.currentTime);
          }}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={(e) => {
            const a = e.currentTarget;
            console.error("[AudioPlayer] Failed to load audio.", {
              src: a.src,
              networkState: a.networkState,
              error: a.error?.message ?? a.error?.code,
            });
            setHasAudio(false);
            setIsPlaying(false);
          }}
        />
      )}

      {/* ── Top area: Header with Audio Player ── */}
      <div className="flex-shrink-0 relative mx-6 mt-6 rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* decorative gradient strip */}
        <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500" />

        <div className="p-5 pt-6">
          {/* Row 1: Title + Search + Export */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-md shadow-orange-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-white">
                  <path fillRule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 0 0 3 3h15a3 3 0 0 1-3-3V4.875C17.25 3.839 16.41 3 15.375 3H4.125ZM12 9.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H12Zm-.75-2.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H12a.75.75 0 0 1-.75-.75ZM6 12.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5H6Zm-.75 3.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75ZM6 6.75a.75.75 0 0 0-.75.75v3c0 .414.336.75.75.75h3a.75.75 0 0 0 .75-.75v-3A.75.75 0 0 0 9 6.75H6Z" clipRule="evenodd" />
                  <path d="M18.75 6.75h1.875c.621 0 1.125.504 1.125 1.125V18a1.5 1.5 0 0 1-3 0V6.75Z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Transcript #{transcriptId}
              </h2>

              <div className="ml-2 flex items-center gap-2">
                <SearchSelect
                  value={filterSpeaker}
                  onChange={setFilterSpeaker}
                  options={uniqueSpeakers}
                  placeholder="All speakers"
                  className="w-40"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                    </svg>
                  }
                  speakers={speakers}
                  onSpeakerSave={saveSpeakerName}
                  getSpeakerColor={getSpeakerColor}
                  getSpeakerInitials={getSpeakerInitials}
                />

                <SearchSelect
                  value={filterTag}
                  onChange={setFilterTag}
                  options={allTags}
                  placeholder="All tags"
                  className="w-40"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Search input */}
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400">
                  <path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery) {
                      e.preventDefault();
                      if (e.shiftKey) goToPrevMatch(); else goToNextMatch();
                    }
                  }}
                  placeholder="Search transcript.."
                  className={`w-64 rounded-xl border bg-zinc-50 py-2 pl-9 text-sm font-medium placeholder:text-zinc-400 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:bg-zinc-800 dark:placeholder:text-zinc-500 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10 dark:focus:border-orange-500/50 dark:focus:ring-orange-500/20 ${
                    searchQuery ? "pr-20 border-orange-300 dark:border-orange-500/40" : "pr-8 border-zinc-200 dark:border-zinc-700"
                  }`}
                />
                {searchQuery && (
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    <span className="text-[10px] font-semibold tabular-nums text-zinc-400">
                      {totalMatches > 0 ? `${searchMatchIndex + 1}/${totalMatches}` : "0/0"}
                    </span>
                    <button type="button" onClick={goToPrevMatch} disabled={totalMatches === 0} className="flex h-4 w-4 cursor-pointer items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 disabled:cursor-default disabled:opacity-30 dark:hover:bg-zinc-700 dark:hover:text-zinc-300" aria-label="Previous match">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path fillRule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" /></svg>
                    </button>
                    <button type="button" onClick={goToNextMatch} disabled={totalMatches === 0} className="flex h-4 w-4 cursor-pointer items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 disabled:cursor-default disabled:opacity-30 dark:hover:bg-zinc-700 dark:hover:text-zinc-300" aria-label="Next match">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" /></svg>
                    </button>
                    <button type="button" onClick={() => setSearchQuery("")} className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300" aria-label="Clear search">×</button>
                  </div>
                )}
              </div>

              {/* Activity toggle */}
              <button
                type="button"
                title={showEditorActivity ? "Hide activity" : "Show activity"}
                onClick={() => setShowEditorActivity((prev) => !prev)}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition-all ${
                  showEditorActivity
                    ? "border-violet-400 bg-violet-500 text-white shadow-violet-200 hover:bg-violet-600 dark:border-violet-500 dark:bg-violet-500 dark:shadow-violet-500/20 dark:hover:bg-violet-400"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-violet-500/40 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                </svg>
                Activity
              </button>

              {/* Comments toggle */}
              <button
                type="button"
                title={showComments ? "Hide comments" : "Show comments"}
                onClick={() => setShowComments((prev) => !prev)}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition-all ${
                  showComments
                    ? "border-sky-400 bg-sky-500 text-white shadow-sky-200 hover:bg-sky-600 dark:border-sky-500 dark:bg-sky-500 dark:shadow-sky-500/20 dark:hover:bg-sky-400"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-sky-500/40 dark:hover:bg-sky-500/10 dark:hover:text-sky-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317 .713 2.435 0 3.277 0 4.26v4.48ZM5 6.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 6.5Zm.75 1.75a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clipRule="evenodd" />
                </svg>
                Comments
                {comments.length > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${showComments ? "bg-white/20 text-white" : "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"}`}>
                    {comments.length}
                  </span>
                )}
              </button>

              {/* Export dropdown */}
              <div className="relative" ref={exportRef}>
                <button
                  type="button"
                  title="Export transcript menu"
                  aria-label="Export transcript menu"
                  onClick={() => setExportOpen((prev) => !prev)}
                  className={`cursor-pointer inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition-all ${
                    exportOpen
                      ? "border-orange-500 bg-orange-600 text-white ring-2 ring-orange-300 shadow-orange-200 dark:border-orange-400 dark:bg-orange-500 dark:ring-orange-500/30 dark:shadow-orange-500/20"
                      : "border-orange-400 bg-orange-500 text-white shadow-orange-200 hover:bg-orange-600 hover:shadow-md hover:shadow-orange-200 dark:border-orange-500 dark:bg-orange-500 dark:shadow-orange-500/20 dark:hover:bg-orange-400"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Zm4 3.5a.75.75 0 0 1 .75.75v2.69l.72-.72a.75.75 0 1 1 1.06 1.06l-2 2a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 0 1 1.06-1.06l.72.72V6.25A.75.75 0 0 1 8 5.5Z" clipRule="evenodd" />
                  </svg>
                  Export
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`h-3 w-3 text-white/70 transition-transform ${exportOpen ? "rotate-180" : ""}`}>
                    <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>

                {exportOpen && (
                  <div className="absolute right-0 top-full z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="py-1">
                      <button type="button" onClick={() => { exportAsText(); setExportOpen(false); }} className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-zinc-500 dark:text-zinc-400"><path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4ZM5.25 7.5A.75.75 0 0 1 6 6.75h4a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>
                        </div>
                        <p className="font-semibold text-zinc-700 dark:text-zinc-200">Text File</p>
                      </button>
                      <button type="button" onClick={() => { exportAsJson(); setExportOpen(false); }} className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-zinc-500 dark:text-zinc-400"><path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Zm1 5.75a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm3 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75ZM5.75 10a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5h-.5Zm2.25.75a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>
                        </div>
                        <p className="font-semibold text-zinc-700 dark:text-zinc-200">JSON File</p>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Audio Player ── */}
        <div className="border-t border-zinc-200/80 pb-3 dark:border-zinc-800">
          {/* progress bar (clickable) */}
          <div
            className="group/progress relative h-1.5 w-full cursor-pointer bg-zinc-200/60 transition-all hover:h-2.5 dark:bg-zinc-700/60"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              seekTo(pct * totalDuration);
            }}
          >
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-200" style={{ width: `${totalDuration > 0 ? (playerTime / totalDuration) * 100 : 0}%` }} />
            <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-orange-500 shadow opacity-0 transition-all duration-200 group-hover/progress:opacity-100 dark:border-zinc-900" style={{ left: `calc(${totalDuration > 0 ? (playerTime / totalDuration) * 100 : 0}% - 6px)` }} />
          </div>

          <div className="flex items-center gap-4 px-5 py-2.5">
            {/* Left: controls */}
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => seekTo(playerTime - 10)} className="cursor-pointer rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300" aria-label="Skip back 10 seconds" title="Back 10s">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path d="M12.5 4V2L9 5.5l3.5 3V6.5c3.59 0 6.5 2.91 6.5 6.5s-2.91 6.5-6.5 6.5S6 16.59 6 13H4c0 4.69 3.81 8.5 8.5 8.5s8.5-3.81 8.5-8.5-3.81-8.5-8.5-8.5Z" fill="currentColor" />
                  <text x="12.5" y="15.5" textAnchor="middle" fontSize="7.5" fontWeight="bold" fontFamily="system-ui, sans-serif" fill="currentColor">10</text>
                </svg>
              </button>

              <button
                type="button"
                onClick={togglePlayback}
                className={`cursor-pointer rounded-full p-2.5 transition-all duration-200 ${
                  isPlaying
                    ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:brightness-110 active:scale-95"
                    : "bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 hover:brightness-110 active:scale-95"
                }`}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Zm10.5 0a.75.75 0 0 1 .75.75v12a.75.75 0 0 1-1.5 0V6a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                )}
              </button>

              <button type="button" onClick={() => seekTo(playerTime + 10)} className="cursor-pointer rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300" aria-label="Skip forward 10 seconds" title="Forward 10s">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path d="M11.5 4V2l3.5 3.5-3.5 3V6.5C7.91 6.5 5 9.41 5 13s2.91 6.5 6.5 6.5S18 16.59 18 13h2c0 4.69-3.81 8.5-8.5 8.5S3 17.69 3 13s3.81-8.5 8.5-8.5Z" fill="currentColor" />
                  <text x="11.5" y="15.5" textAnchor="middle" fontSize="7.5" fontWeight="bold" fontFamily="system-ui, sans-serif" fill="currentColor">10</text>
                </svg>
              </button>
            </div>

            {/* Center: time + active section info */}
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <span className="inline-flex items-center font-mono text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                {formatSecondsToTime(playerTime)}
                <span className="mx-1 text-zinc-300 dark:text-zinc-600">/</span>
                {formatSecondsToTime(totalDuration)}
              </span>

              {/* Speed selector */}
              <div ref={speedMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
                  className={`cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold tabular-nums transition-all ${
                    playbackSpeed !== 1
                      ? "bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:hover:bg-orange-500/25"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                  }`}
                  title="Playback speed"
                >
                  {playbackSpeed}x
                </button>
                {speedMenuOpen && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => { setPlaybackSpeed(speed); setSpeedMenuOpen(false); }}
                        className={`cursor-pointer flex w-full items-center gap-2 px-4 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
                          playbackSpeed === speed
                            ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                            : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {playbackSpeed === speed && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-orange-500"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>
                        )}
                        {playbackSpeed !== speed && <span className="w-3" />}
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

              {displaySection ? (
                <div className="flex items-center gap-2 min-w-0 transition-opacity duration-200" style={{ opacity: activeSection ? 1 : 0.5 }}>
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-[8px] font-bold text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                    {getSpeakerInitials(getSpeakerDisplayName(displaySection))}
                  </div>
                  <span className="truncate text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {getSpeakerDisplayName(displaySection) ?? "Unknown"}
                  </span>
                  <span className="hidden sm:inline text-[10px] text-zinc-400 dark:text-zinc-500">
                    {formatTimestamp(displaySection.begin_timestamp)} → {formatTimestamp(displaySection.end_timestamp)}
                  </span>
                </div>
              ) : hasAudio && isPlaying ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
                  </span>
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Playing audio</span>
                  {sections.length === 0 && (
                    <span className="hidden sm:inline text-[10px] text-zinc-400 dark:text-zinc-500">— no transcript sections loaded</span>
                  )}
                </div>
              ) : hasAudio ? (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                  {sections.length > 0 ? "No section at this time" : "Audio loaded — press play"}
                </span>
              ) : (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">No audio file uploaded</span>
              )}
            </div>

            {/* Right: volume + waveform */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setIsMuted(!isMuted)} className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300" aria-label={isMuted ? "Unmute" : "Mute"}>
                {isMuted || volume === 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 1 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" /><path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" /></svg>
                )}
              </button>
              <input type="range" min="0" max="100" value={isMuted ? 0 : volume} onChange={(e) => { setVolume(Number(e.target.value)); if (isMuted) setIsMuted(false); }} className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-orange-500 dark:bg-zinc-700" aria-label="Volume" />

              {/* Waveform */}
              <div className="hidden sm:flex items-center gap-[2px] h-6 ml-2">
                {[3, 5, 8, 4, 7, 10, 6, 9, 4, 7, 5, 8, 3, 6, 9, 5, 7, 4, 8, 6].map((h, i) => (
                  <div
                    key={i}
                    className={`w-[2px] rounded-full transition-all duration-300 ${
                      isPlaying && totalDuration > 0 && (i / 20) <= (playerTime / totalDuration)
                        ? "bg-orange-400 dark:bg-orange-500"
                        : "bg-zinc-200 dark:bg-zinc-700"
                    }`}
                    style={{ height: `${h * 2.4}px`, animationDelay: isPlaying ? `${i * 80}ms` : undefined }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex flex-1 min-h-0">
      {/* ── Section list with inline comments ── */}
      <div ref={sectionListRef} className="flex-1 overflow-y-auto overflow-x-clip pt-4 pb-6 space-y-2.5 pl-6 pr-6 transition-[padding] duration-200">
        {filteredSections.length === 0 && sections.length > 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-zinc-300 dark:text-zinc-600">
              <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">No sections match the current filters.</p>
            <button type="button" onClick={() => { setFilterSpeaker(""); setFilterTag(""); setSearchQuery(""); }} className="mt-1 text-xs font-semibold text-orange-500 hover:text-orange-600 dark:text-orange-400">Clear filters</button>
          </div>
        )}

        {sections.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
            {hasAudio ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/15">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-orange-500 dark:text-orange-400"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" /><path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" /></svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Audio is ready — no transcript sections yet</p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Use the player above to listen. Transcript sections will appear here once the audio is processed.</p>
                </div>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-zinc-300 dark:text-zinc-600"><path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52a1.595 1.595 0 0 1 1.348 1.58v7.95c0 .713-.471 1.345-1.152 1.546a48.34 48.34 0 0 0-2.398.757 16.906 16.906 0 0 0-.09.04l-.003.002H16.85l-.004.001a3.482 3.482 0 0 0-.135.071 14.205 14.205 0 0 0-1.534 1.016c-.88.69-1.927 1.716-2.302 3.186a2.27 2.27 0 0 1-.385.82c-.062.072-.169.165-.326.166h-.008c-.157-.001-.264-.094-.326-.166a2.27 2.27 0 0 1-.385-.82c-.375-1.47-1.422-2.497-2.302-3.186a14.205 14.205 0 0 0-1.534-1.016 3.482 3.482 0 0 0-.135-.07l-.004-.002h-.001l-.003-.002a16.906 16.906 0 0 0-.09-.04 48.34 48.34 0 0 0-2.398-.757A1.594 1.594 0 0 1 3.5 12.3V4.35c0-.78.56-1.447 1.348-1.58Z" clipRule="evenodd" /></svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">No transcript sections loaded</p>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Upload an audio file to get started.</p>
                </div>
              </>
            )}
          </div>
        )}

        {filteredSections.map((section, idx) => {
          const tags = section.tags;
          const isSectionActive = activeSectionId === section.id;
          const isSaving = savingId === section.id;
          const speakerName = getSpeakerDisplayName(section);
          const color = getSpeakerColor(speakerName);
          const baseOffset = sectionMatchOffsets.get(section.id) ?? 0;

          return (
            <div key={section.id} className="relative" data-section-id={section.id} ref={(el) => { sectionCardRefs.current.set(section.id, el); }}>
              {/* Insert-above divider (visible on hover) */}
              {idx === 0 && (
                <div className="group/insert flex items-center gap-2 py-1">
                  <div className="h-px flex-1 bg-transparent transition-colors group-hover/insert:bg-orange-300 dark:group-hover/insert:bg-orange-500/40" />
                  <button type="button" disabled={addingSectionAtPosition !== null} onClick={() => addSection(section.section_id)} className="cursor-pointer opacity-0 group-hover/insert:opacity-100 transition-opacity inline-flex items-center gap-1 rounded-full border border-dashed border-orange-300 bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-orange-600 hover:bg-orange-100 hover:border-orange-400 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20 disabled:opacity-50" title="Insert section above">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" /></svg>
                    Insert
                  </button>
                  <div className="h-px flex-1 bg-transparent transition-colors group-hover/insert:bg-orange-300 dark:group-hover/insert:bg-orange-500/40" />
                </div>
              )}

              <div className="flex items-center gap-3">
                {/* Play button */}
                <button
                  type="button"
                  onClick={() => handlePlay(section)}
                  className={`cursor-pointer mt-2 flex-shrink-0 rounded-full p-2.5 transition-all duration-200 ${
                    isSectionActive && isPlaying
                      ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:brightness-110 active:scale-95"
                      : "bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 hover:brightness-110 active:scale-95"
                  }`}
                  aria-label={isSectionActive && isPlaying ? "Playing" : "Play from this section"}
                >
                  <PlayIcon playing={isSectionActive && isPlaying} />
                </button>

                {/* Card */}
                <div
                  data-section-card
                  className={`group relative flex-1 min-w-0 rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:bg-zinc-900 ${
                    isSectionActive
                      ? "border-orange-300 shadow-orange-100 ring-2 ring-orange-200/70 dark:border-orange-500/50 dark:shadow-orange-500/5 dark:ring-orange-500/20"
                      : "border-zinc-200/80 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                  }`}
                >
                  {/* left accent stripe */}
                  <div className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${isSectionActive ? "bg-gradient-to-b from-orange-400 to-amber-400" : color.bg}`} />

                  {/* saving indicator */}
                  {isSaving && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-4 z-10 flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                      Saving…
                    </div>
                  )}

                  <div className="flex">
                    {/* ── Left: transcript content ── */}
                    <div className="flex-1 min-w-0 p-3.5 pl-5">
                      {/* speaker + timestamps */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ring-2 ${color.bg} ${color.text} ${color.ring}`}>
                            {getSpeakerInitials(speakerName)}
                          </div>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {speakerName ?? ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-mono text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-zinc-400"><path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" /></svg>
                            {formatTimestamp(section.begin_timestamp)} → {formatTimestamp(section.end_timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* transcript text */}
                      <div className="mt-2.5">
                        <InlineEdit
                          value={section.edited_text ?? section.original_text ?? ""}
                          onSave={(v) => saveField(section.id, "edited_text", v)}
                          onEditStart={pausePlayback}
                          multiline
                          className="block w-full rounded-xl text-sm leading-snug"
                          highlight={searchQuery}
                          matchOffset={baseOffset}
                          activeMatchIndex={searchMatchIndex}
                        />
                      </div>
                    </div>

                    {/* ── Right: icon strip with popouts ── */}
                    <div className="relative flex-shrink-0 border-l border-zinc-100 dark:border-zinc-800 flex flex-col items-center gap-1 py-2 px-1.5">
                      {/* Notes icon */}
                      <button
                        type="button"
                        onClick={() => {
                          if (activeCommentSectionId === section.id && showComments) {
                            setActiveCommentSectionId(null);
                            setCommentsCollapsed(true);
                            setExpandedCommentSections((prev) => { const next = new Set(prev); next.delete(section.id); return next; });
                          } else {
                            if (!showComments) setShowComments(true);
                            setCommentsCollapsed(false);
                            setActiveCommentSectionId(section.id);
                            setExpandedCommentSections((prev) => new Set(prev).add(section.id));
                          }
                        }}
                        className={`cursor-pointer relative rounded-lg p-2 transition-all ${
                          activeCommentSectionId === section.id && showComments
                            ? "bg-sky-100 text-sky-600 ring-2 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-400 dark:ring-sky-500/40"
                            : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        }`}
                        title="Comments"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M1 8.74c0 .983.713 1.825 1.69 1.943.764.092 1.534.164 2.31.216v2.351a.75.75 0 0 0 1.28.53l2.51-2.51c.182-.181.427-.29.684-.307A41.158 41.158 0 0 0 14.31 10.683C15.287 10.565 16 9.723 16 8.74V4.26c0-.983-.713-1.825-1.69-1.943A41.223 41.223 0 0 0 8 2C5.82 2 3.694 2.12 1.69 2.317 .713 2.435 0 3.277 0 4.26v4.48ZM5 6.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 6.5Zm.75 1.75a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" clipRule="evenodd" /></svg>
                        {comments.filter((c) => c.section_id === section.section_id).length > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-sky-500 px-1 text-[9px] font-bold text-white">
                            {comments.filter((c) => c.section_id === section.section_id).length}
                          </span>
                        )}
                      </button>

                      {/* Tags icon */}
                      <button
                        type="button"
                        onClick={() => setSidebarPanel(sidebarPanel?.sectionId === section.id && sidebarPanel?.panel === "tags" ? null : { sectionId: section.id, panel: "tags" })}
                        className={`cursor-pointer relative rounded-lg p-2 transition-all ${
                          sidebarPanel?.sectionId === section.id && sidebarPanel?.panel === "tags"
                            ? "bg-orange-100 text-orange-600 ring-2 ring-orange-300 dark:bg-orange-500/20 dark:text-orange-400 dark:ring-orange-500/40"
                            : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        }`}
                        title="Tags"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
                        {tags.length > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">{tags.length}</span>
                        )}
                      </button>

                      {/* Edits icon */}
                      <button
                        type="button"
                        onClick={() => setDiffSectionId(section.id)}
                        className={`cursor-pointer relative rounded-lg p-2 transition-all ${
                          (section.edited_text ?? null) !== null && section.edited_text !== section.original_text
                            ? "text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-500/20"
                            : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        }`}
                        title={(section.edited_text ?? null) !== null && section.edited_text !== section.original_text ? "Show edits" : "Compare"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9ZM7.25 3.5H3.5v9h3.75v-9Zm1.5 0v9H12.5v-9H8.75Z" clipRule="evenodd" /></svg>
                        {(section.edited_text ?? null) !== null && section.edited_text !== section.original_text && (
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900" />
                        )}
                      </button>

                      {/* Delete section icon */}
                      <button type="button" onClick={() => deleteSection(section.id)} className="cursor-pointer relative rounded-lg p-2 transition-all text-zinc-300 hover:bg-red-50 hover:text-red-500 dark:text-zinc-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 opacity-0 group-hover:opacity-100" title="Delete section">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" /></svg>
                      </button>

                      {/* ── Tags popout ── */}
                      {sidebarPanel?.sectionId === section.id && sidebarPanel?.panel === "tags" && (
                        <div className="absolute right-full top-0 z-40 mr-2 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
                            <div className="flex items-center gap-1.5">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-orange-500"><path fillRule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v2.879a2.5 2.5 0 0 0 .732 1.767l4.5 4.5a2.5 2.5 0 0 0 3.536 0l2.878-2.878a2.5 2.5 0 0 0 0-3.536l-4.5-4.5A2.5 2.5 0 0 0 7.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tags</span>
                            </div>
                            <button type="button" onClick={() => setSidebarPanel(null)} className="cursor-pointer rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300" aria-label="Close">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                            </button>
                          </div>
                          <div className="p-4">
                            <TagEditor tags={tags} onAdd={(tag) => handleAddTag(section.id, tags, tag)} onRemove={(tag) => handleRemoveTag(section.id, tags, tag)} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Insert-below divider */}
              <div className="group/insert flex items-center gap-2 py-1">
                <div className="h-px flex-1 bg-transparent transition-colors group-hover/insert:bg-orange-300 dark:group-hover/insert:bg-orange-500/40" />
                <button type="button" disabled={addingSectionAtPosition !== null} onClick={() => addSection(section.section_id + 1)} className="cursor-pointer opacity-0 group-hover/insert:opacity-100 transition-opacity inline-flex items-center gap-1 rounded-full border border-dashed border-orange-300 bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-orange-600 hover:bg-orange-100 hover:border-orange-400 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20 disabled:opacity-50" title="Insert section below">
                  {addingSectionAtPosition === section.section_id + 1 ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3"><path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" /></svg>
                  )}
                  Insert
                </button>
                <div className="h-px flex-1 bg-transparent transition-colors group-hover/insert:bg-orange-300 dark:group-hover/insert:bg-orange-500/40" />
              </div>


            </div>
          );
        })}

        {/* Add Section button at the bottom */}
        {!loading && (
          <div className="flex justify-center pt-2 pb-4">
            <button type="button" disabled={addingSectionAtPosition !== null} onClick={() => addSection()} className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-dashed border-orange-300 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-600 shadow-sm transition-all hover:bg-orange-100 hover:border-orange-400 hover:shadow-md dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20 disabled:opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5"><path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" /></svg>
              Add Section
            </button>
          </div>
        )}

        {/* Spacer */}
        {filteredSections.length > 0 && <div className="h-[60vh]" aria-hidden="true" />}
      </div>

      {/* ── Comments panel ── */}
      <CommentsPanel
        transcriptId={transcriptId}
        comments={comments}
        loading={loadingComments}
        sections={sections.map((s) => ({ id: s.id, section_id: s.section_id, speaker: getSpeakerDisplayName(s) }))}
        activeSectionId={activeCommentSectionId}
        onSectionSelect={(id) => setActiveCommentSectionId(id)}
        onCommentAdded={() => fetchComments(true)}
        onJumpToSection={jumpToSection}
        collapsed={commentsCollapsed}
        onCollapsedChange={setCommentsCollapsed}
      />

      {/* ── Editor Activity panel ── */}
      <EditorActivity
        activityLog={activityLog}
        loading={loadingActivity}
        recentEdits={recentEdits}
        loadingRecentEdits={loadingRecentEdits}
        onJumpToSection={jumpToSection}
        onRefresh={() => fetchActivity()}
        onRefreshRecentEdits={() => fetchRecentEdits()}
        collapsed={activityCollapsed}
        onCollapsedChange={setActivityCollapsed}
      />
      </div>

      {/* ── Diff modal ── */}
      {diffSectionId !== null && (() => {
        const sec = sections.find((s) => s.id === diffSectionId);
        if (!sec) return null;
        return <DiffModal section={sec} onClose={() => setDiffSectionId(null)} onSave={(v) => saveField(sec.id, "edited_text", v)} />;
      })()}
    </section>
  );
}
