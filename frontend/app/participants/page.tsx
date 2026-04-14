"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type DragEvent } from "react";
import Link from "next/link";
import RequirePermission from "@/app/components/require-permission";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Participant = {
  id: number;
  name: string | null;
  role: string | null;
  description: string | null;
  join_date: string | null;
  withdrawal_date: string | null;
  status: string | null;
  number_of_audio_files: number | null;
  number_of_videos: number | null;
  created: string | null;
  modified: string | null;
  active: number;
};

type Transcript = {
  id: number;
  unique_id: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  microphone_color_id: number | null;
  participant_id: number | null;
  lesson_number: string | null;
  lesson_subject: string | null;
  tags: string[];
  created: string | null;
  modified: string | null;
  active: number;
};

type MicrophoneColor = {
  id: number;
  color: string | null;
  description: string | null;
};

type LessonSubject = {
  id: number;
  name: string | null;
  description: string | null;
};

type TranscriptFile = {
  id: number;
  transcription_id: number | null;
  file_name: string | null;
  file_type: string | null;
  file_path: string | null;
  is_active: number | null;
};

type CreateTranscriptPayload = {
  title: string;
  description: string;
  participant_id: number;
  microphone_color_id: string;
  lesson_number: string;
  lesson_subject: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-CA") : "—";

/** Natural sort for lesson numbers like "1", "2", "10" */
const naturalSort = (a: string, b: string) => {
  const na = parseInt(a.replace(/\D/g, ""), 10);
  const nb = parseInt(b.replace(/\D/g, ""), 10);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.localeCompare(b);
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [micColors, setMicColors] = useState<MicrophoneColor[]>([]);
  const [lessonSubjects, setLessonSubjects] = useState<LessonSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* upload dialog */
  const [uploadForParticipant, setUploadForParticipant] = useState<Participant | null>(null);
  const [uploadMicColorId, setUploadMicColorId] = useState<number | null>(null);
  const [uploadLessonNumber, setUploadLessonNumber] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTranscriptPayload>({
    title: "",
    description: "",
    participant_id: 0,
    microphone_color_id: "",
    lesson_number: "",
    lesson_subject: "",
  });

  /* audio file */
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStep, setUploadStep] = useState<"idle" | "creating" | "uploading" | "done" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* transcript file */
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [isDraggingTranscript, setIsDraggingTranscript] = useState(false);
  const transcriptFileInputRef = useRef<HTMLInputElement>(null);

  /* delete confirmation */
  const [deleteTarget, setDeleteTarget] = useState<Transcript | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* add participant dialog */
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [addParticipantForm, setAddParticipantForm] = useState({
    name: "",
    role: "",
    description: "",
    join_date: "",
  });

  /* ---- data loading ---- */

  const loadAll = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [pRes, tRes, mRes, lsRes] = await Promise.all([
        fetch("/api/metadata/participants"),
        fetch("/api/transcripts"),
        fetch("/api/metadata/microphone-colors"),
        fetch("/api/metadata/lesson-subjects"),
      ]);
      if (!pRes.ok || !tRes.ok || !mRes.ok || !lsRes.ok) throw new Error();
      const [pData, tData, mData, lsData] = await Promise.all([
        pRes.json() as Promise<Participant[]>,
        tRes.json() as Promise<Transcript[]>,
        mRes.json() as Promise<MicrophoneColor[]>,
        lsRes.json() as Promise<LessonSubject[]>,
      ]);
      setParticipants(pData);
      setTranscripts(tData);
      setMicColors(mData);
      setLessonSubjects(lsData);
      setError(null);
    } catch {
      setError("Could not load data.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* ---- build the matrix columns ---- */

  /** All unique lesson numbers across transcripts, sorted naturally */
  const lessonNumbers = useMemo(() => {
    const set = new Set<string>();
    for (const t of transcripts) {
      if (t.lesson_number) set.add(t.lesson_number);
    }
    return Array.from(set).sort(naturalSort);
  }, [transcripts]);

  /** Mic colors to show as column groups */
  const activeMicColors = useMemo(() => {
    return micColors.filter((c) => c.color);
  }, [micColors]);

  /** Quick lookup: participantId-micColorId-lessonNumber → transcript */
  const transcriptMap = useMemo(() => {
    const map = new Map<string, Transcript>();
    for (const t of transcripts) {
      if (t.participant_id && t.microphone_color_id && t.lesson_number) {
        map.set(
          `${t.participant_id}-${t.microphone_color_id}-${t.lesson_number}`,
          t
        );
      }
    }
    return map;
  }, [transcripts]);

  /* Fallback: if no lessons exist yet show at least 4 placeholder columns */
  const displayLessons =
    lessonNumbers.length > 0
      ? lessonNumbers
      : ["1", "2", "3", "4"];

  /* ---- create transcript ---- */

  const openUpload = (p: Participant, mcId?: number, lesson?: string) => {
    setUploadForParticipant(p);
    setUploadMicColorId(mcId ?? null);
    setUploadLessonNumber(lesson ?? "");
    setAudioFile(null);
    setTranscriptFile(null);
    setIsDragging(false);
    setIsDraggingTranscript(false);
    setUploadStep("idle");
    setUploadMessage("");
    const mcLabel = mcId ? micColors.find((c) => c.id === mcId)?.color ?? "" : "";
    setCreateForm({
      title: lesson ? `${p.name ?? "Participant"} — ${mcLabel ? mcLabel + " Mic" : ""} Lesson ${lesson}`.trim() : "",
      description: "",
      participant_id: p.id,
      microphone_color_id: mcId ? String(mcId) : "",
      lesson_number: lesson ?? "",
      lesson_subject: "",
    });
  };

  /* drag-and-drop helpers — audio */
  const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3"))) {
      setAudioFile(file);
    }
  };
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAudioFile(file);
  };

  /* drag-and-drop helpers — transcript */
  const onDragOverTranscript = (e: DragEvent) => { e.preventDefault(); setIsDraggingTranscript(true); };
  const onDragLeaveTranscript = (e: DragEvent) => { e.preventDefault(); setIsDraggingTranscript(false); };
  const onDropTranscript = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingTranscript(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt"))) {
      setTranscriptFile(file);
    }
  };
  const onTranscriptFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setTranscriptFile(file);
  };

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!uploadForParticipant) return;
    setIsCreating(true);
    setError(null);
    setUploadStep("creating");
    setUploadMessage("Creating transcript entry…");

    try {
      /* Step 1 — create transcript metadata */
      const mcLabel = createForm.microphone_color_id
        ? micColors.find((c) => c.id === Number(createForm.microphone_color_id))?.color ?? ""
        : "";
      const autoTitle = [
        uploadForParticipant.name ?? "Participant",
        mcLabel ? `${mcLabel} Mic` : "",
        createForm.lesson_number.trim() ? `Lesson ${createForm.lesson_number.trim()}` : "",
      ].filter(Boolean).join(" — ");

      const payload: Record<string, unknown> = {
        title: autoTitle || createForm.title.trim(),
        description: createForm.description.trim() || null,
        participant_id: uploadForParticipant.id,
        lesson_number: createForm.lesson_number.trim() || null,
        lesson_subject: createForm.lesson_subject.trim() || null,
      };
      if (createForm.microphone_color_id) {
        payload.microphone_color_id = Number(createForm.microphone_color_id);
      }
      const res = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create transcript entry.");
      const created = (await res.json()) as { id?: number; data?: { id?: number } };
      const newId = created.id ?? created.data?.id;

      /* Step 2 — upload audio + transcript files (if both were selected) */
      if (audioFile && transcriptFile && newId) {
        setUploadStep("uploading");
        setUploadMessage(`Uploading ${audioFile.name} + ${transcriptFile.name}…`);
        const form = new FormData();
        form.append("audio_file", audioFile);
        form.append("transcript_file", transcriptFile);

        const uploadRes = await fetch(`/api/transcripts/${newId}/upload-audio`, {
          method: "POST",
          body: form,
        });
        if (!uploadRes.ok) {
          // Transcript was created but upload failed — still reload
          console.error("Upload failed", await uploadRes.text());
        }
      }

      setUploadStep("done");
      setUploadMessage("Done!");
      setUploadForParticipant(null);
      await loadAll(false);
    } catch (err) {
      setUploadStep("error");
      setUploadMessage(err instanceof Error ? err.message : "Something went wrong.");
      setError("Could not create transcript.");
    } finally {
      setIsCreating(false);
    }
  };

  /* ---- delete transcript + its files ---- */

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError(null);
    try {
      /* Step 1 — fetch associated files */
      const filesRes = await fetch(`/api/transcripts/${deleteTarget.id}/files`);
      if (filesRes.ok) {
        const files = (await filesRes.json()) as TranscriptFile[];
        /* Step 2 — delete each file entry */
        for (const f of files) {
          await fetch(`/api/transcripts/${deleteTarget.id}/files/${f.id}`, {
            method: "DELETE",
          });
        }
      }
      /* Step 3 — delete the transcript itself */
      const delRes = await fetch(`/api/transcripts/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!delRes.ok && delRes.status !== 204) {
        throw new Error("Failed to delete transcript.");
      }
      setDeleteTarget(null);
      await loadAll(false);
    } catch {
      setError("Could not delete transcript.");
    } finally {
      setIsDeleting(false);
    }
  };

  /* ---- add participant ---- */

  const openAddParticipant = () => {
    const nextNum = participants.length + 1;
    const defaultName = `participant_${String(nextNum).padStart(3, "0")}`;
    setAddParticipantForm({ name: defaultName, role: "Teacher", description: "", join_date: "" });
    setShowAddParticipant(true);
  };

  const handleAddParticipant = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAddingParticipant(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: addParticipantForm.name.trim(),
      };
      if (addParticipantForm.role.trim()) payload.role = addParticipantForm.role.trim();
      if (addParticipantForm.description.trim()) payload.description = addParticipantForm.description.trim();
      if (addParticipantForm.join_date) payload.join_date = new Date(addParticipantForm.join_date).toISOString();

      const res = await fetch("/api/metadata/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create participant.");
      setShowAddParticipant(false);
      await loadAll(false);
    } catch {
      setError("Could not create participant.");
    } finally {
      setIsAddingParticipant(false);
    }
  };

  /* ---- badge helpers ---- */

  const statusBadge = (status: string | null) => {
    const s = status ?? "";
    const styles: Record<string, string> = {
      Active:
        "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300",
      Withdrawn:
        "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",
      Pending:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300",
    };
    return (
      <span
        className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium ${styles[s] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}
      >
        {s || "—"}
      </span>
    );
  };

  const roleBadge = (role: string | null) => {
    const r = role ?? "";
    const lower = r.toLowerCase();
    const bg = lower.includes("pre")
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
      : lower.includes("post")
        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
    return (
      <span
        className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium ${bg}`}
      >
        {r || "—"}
      </span>
    );
  };

  const cellBadge = (
    t: Transcript | undefined,
    p: Participant,
    mcId: number,
    lesson: string
  ) => {
    if (!t) {
      return (
        <button
          type="button"
          onClick={() => openUpload(p, mcId, lesson)}
          className="inline-block cursor-pointer rounded-full bg-zinc-100 px-3 py-0.5 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-sky-100 hover:text-sky-600 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-sky-900/40 dark:hover:text-sky-400"
        >
          Empty
        </button>
      );
    }
    return (
      <span className="relative inline-flex items-center">
        <Link
          href={`/transcriptions/${t.id}`}
          className="inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-[11px] font-medium leading-[22px] text-green-700 shadow-sm hover:bg-green-200 dark:bg-green-900/60 dark:text-green-300 dark:hover:bg-green-900"
        >
          Uploaded
        </Link>
        <button
          type="button"
          onClick={() => setDeleteTarget(t)}
          title="Delete transcript & audio"
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-all hover:bg-red-600 hover:scale-110 dark:bg-red-600 dark:hover:bg-red-700"
        >
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </span>
    );
  };

  /* ---- frozen column definitions ---- */

  const frozenCols = [
    { key: "id", label: "ID", width: 140, align: "" },
    { key: "joinDate", label: "Join Date", width: 105, align: "" },
    { key: "withdrawalDate", label: "Withdrawal Date", width: 140, align: "" },
    { key: "pd", label: "PD", width: 80, align: "text-center" },
    { key: "audioFiles", label: "# Audio Files", width: 105, align: "text-center" },
    { key: "videos", label: "# of Videos", width: 100, align: "text-center" },
    { key: "status", label: "Status", width: 85, align: "" },
  ];

  /** Cumulative left positions for each frozen column */
  const frozenLefts = frozenCols.reduce<number[]>((acc, col, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + frozenCols[i - 1].width);
    return acc;
  }, []);

  /* ---- render ---- */

  const thBase =
    "whitespace-nowrap border-b border-r border-zinc-200 px-3 py-2 font-semibold dark:border-zinc-700";
  const tdBase =
    "whitespace-nowrap border-r border-zinc-200 px-3 py-2.5 dark:border-zinc-700";

  /** Style object for a frozen header cell */
  const stickyThStyle = (i: number) =>
    ({
      position: "sticky" as const,
      left: frozenLefts[i],
      width: frozenCols[i].width,
      minWidth: frozenCols[i].width,
      zIndex: 30,
    });

  /** Style object for a frozen body cell */
  const stickyTdStyle = (i: number) =>
    ({
      position: "sticky" as const,
      left: frozenLefts[i],
      width: frozenCols[i].width,
      minWidth: frozenCols[i].width,
      zIndex: 10,
    });

  /** Extra shadow on the last frozen column */
  const lastFrozenShadow = "after:pointer-events-none after:absolute after:right-0 after:top-0 after:h-full after:w-[3px] after:translate-x-full after:bg-gradient-to-r after:from-black/[0.06] after:to-transparent";

  /** Row-value getter for frozen columns */
  const frozenValue = (p: Participant, key: string) => {
    switch (key) {
      case "id":
        return <span className="font-semibold">{p.name ?? `P${String(p.id).padStart(3, "0")}`}</span>;
      case "joinDate":
        return fmtDate(p.join_date);
      case "withdrawalDate":
        return fmtDate(p.withdrawal_date);
      case "pd":
        return roleBadge(p.role);
      case "audioFiles":
        return p.number_of_audio_files ?? 0;
      case "videos":
        return p.number_of_videos ?? 0;
      case "status":
        return statusBadge(p.status);
      default:
        return "—";
    }
  };

  return (
    <RequirePermission permission="participants.read">
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Research Study Participant Tracker</h2>
        <button
          type="button"
          onClick={openAddParticipant}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Participant
        </button>
      </div>

      {loading && <p className="mt-4 text-sm text-zinc-500">Loading…</p>}
      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && participants.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500">No participants found.</p>
      )}

      {/* ---- single table with sticky frozen columns ---- */}
      {!loading && !error && participants.length > 0 && (
        <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-max min-w-full text-left text-xs">
            {/* ---- thead: two header rows ---- */}
            <thead>
              {/* row 1 — frozen meta cols (rowSpan 2) + mic-color group headers */}
              <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                {frozenCols.map((col, i) => (
                  <th
                    key={col.key}
                    rowSpan={2}
                    className={`${thBase} ${col.align} bg-zinc-50 dark:bg-zinc-800 ${i === frozenCols.length - 1 ? `relative ${lastFrozenShadow}` : ""}`}
                    style={stickyThStyle(i)}
                  >
                    {col.label}
                  </th>
                ))}

                {activeMicColors.map((mc) => (
                  <th
                    key={mc.id}
                    colSpan={displayLessons.length}
                    className={`${thBase} text-center font-bold`}
                    style={{
                      color:
                        mc.color?.toLowerCase() === "black"
                          ? undefined
                          : mc.color?.toLowerCase(),
                    }}
                  >
                    {mc.color} Mic
                  </th>
                ))}
              </tr>

              {/* row 2 — lesson sub-columns under each mic color */}
              <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                {activeMicColors.map((mc) =>
                  displayLessons.map((ln) => (
                    <th
                      key={`${mc.id}-${ln}`}
                      className="whitespace-nowrap border-b border-r border-zinc-200 px-3 py-1.5 text-center text-[11px] font-medium dark:border-zinc-700"
                    >
                      Lesson {ln}
                    </th>
                  ))
                )}
              </tr>
            </thead>

            {/* ---- tbody ---- */}
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {participants.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                >
                  {/* frozen meta columns */}
                  {frozenCols.map((col, i) => (
                    <td
                      key={col.key}
                      className={`${tdBase} ${col.align} bg-white dark:bg-zinc-900 ${i === frozenCols.length - 1 ? `relative ${lastFrozenShadow}` : ""}`}
                      style={stickyTdStyle(i)}
                    >
                      {frozenValue(p, col.key)}
                    </td>
                  ))}

                  {/* matrix cells — click Empty to upload */}
                  {activeMicColors.map((mc) =>
                    displayLessons.map((ln) => (
                      <td
                        key={`${p.id}-${mc.id}-${ln}`}
                        className={`${tdBase} text-center`}
                      >
                        {cellBadge(
                          transcriptMap.get(`${p.id}-${mc.id}-${ln}`),
                          p,
                          mc.id,
                          ln
                        )}
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Upload / Create Transcript dialog ---- */}
      {uploadForParticipant && (
        <div className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="animate-modal-slide-up w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
            {/* ---- Header ---- */}
            <div className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-500 px-6 py-4">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -left-4 bottom-0 h-16 w-16 rounded-full bg-white/10 blur-xl" />
              <h3 className="relative text-center text-lg font-semibold tracking-tight text-white">
                Upload Lesson
              </h3>
              <p className="relative mt-0.5 text-center text-xs text-white/70">
                {uploadForParticipant.name ?? "Participant"}
              </p>
              <button
                type="button"
                onClick={() => setUploadForParticipant(null)}
                disabled={isCreating}
                aria-label="Close"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-sm leading-none text-white/90 backdrop-blur-sm transition-all hover:bg-white/25 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* ---- Upload progress overlay ---- */}
            {isCreating && (
              <div className="flex flex-col items-center justify-center px-8 py-14">
                {/* Step indicators */}
                <div className="mb-8 flex items-center gap-3">
                  {[
                    { key: "creating", label: "Create" },
                    { key: "uploading", label: "Upload" },
                    { key: "done", label: "Done" },
                  ].map((s, i, arr) => {
                    const steps = ["creating", "uploading", "done"];
                    const currentIdx = steps.indexOf(uploadStep);
                    const stepIdx = steps.indexOf(s.key);
                    const isComplete = stepIdx < currentIdx || uploadStep === "done";
                    const isCurrent = stepIdx === currentIdx && uploadStep !== "done";
                    return (
                      <div key={s.key} className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-500 ${
                              isComplete
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                                : isCurrent
                                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 ring-4 ring-sky-500/20"
                                  : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                            }`}
                          >
                            {isComplete ? (
                              <svg className="h-4 w-4 animate-check-pop" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              i + 1
                            )}
                          </div>
                          <span className={`mt-1.5 text-[10px] font-medium ${isCurrent ? "text-sky-600 dark:text-sky-400" : isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500"}`}>
                            {s.label}
                          </span>
                        </div>
                        {i < arr.length - 1 && (
                          <div className={`mb-4 h-0.5 w-10 rounded-full transition-all duration-500 ${stepIdx < currentIdx ? "bg-emerald-400" : "bg-zinc-200 dark:bg-zinc-700"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Animated icon */}
                <div className="relative mb-5">
                  <div className="animate-pulse-ring absolute inset-0 rounded-full bg-sky-400/30" style={{ margin: "-12px" }} />
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 shadow-xl shadow-sky-500/25">
                    {uploadStep === "done" ? (
                      <svg className="h-8 w-8 text-white animate-check-pop" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-7 w-7 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3.75 3.75 0 013.57 5.595H6.75z" />
                      </svg>
                    )}
                  </div>
                </div>

                <h4 className="text-base font-semibold text-zinc-700 dark:text-zinc-200">
                  {uploadStep === "uploading" ? "Uploading files…" : uploadStep === "done" ? "All done!" : "Setting things up…"}
                </h4>
                <p className="mt-1 text-xs text-zinc-400">{uploadMessage}</p>

                {/* Progress bar shimmer */}
                {uploadStep !== "done" && (
                  <div className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="animate-shimmer h-full w-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500" style={{ backgroundSize: "200% 100%" }} />
                  </div>
                )}
              </div>
            )}

            {/* ---- Normal form (hidden while uploading) ---- */}
            {!isCreating && (
            <form onSubmit={handleCreate} className="space-y-5 px-6 py-5">
              {/* ---- Lesson Number + Subject row ---- */}
              <div className="grid grid-cols-2 gap-4">
                <label className="group block space-y-1.5 text-sm">
                  <span className="font-medium text-zinc-600 dark:text-zinc-400 group-focus-within:text-sky-600 dark:group-focus-within:text-sky-400 transition-colors">Lesson #</span>
                  <input
                    type="text"
                    value={createForm.lesson_number}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, lesson_number: e.target.value }))
                    }
                    placeholder="e.g. 1"
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-800 shadow-sm transition-all placeholder:text-zinc-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200 dark:focus:border-sky-500 dark:focus:bg-zinc-800 dark:focus:ring-sky-500/20"
                  />
                </label>

                <label className="group block space-y-1.5 text-sm">
                  <span className="font-medium text-zinc-600 dark:text-zinc-400 group-focus-within:text-sky-600 dark:group-focus-within:text-sky-400 transition-colors">Subject</span>
                  <select
                    value={createForm.lesson_subject}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, lesson_subject: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-800 shadow-sm transition-all focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200 dark:focus:border-sky-500 dark:focus:bg-zinc-800 dark:focus:ring-sky-500/20"
                  >
                    <option value="">Select…</option>
                    {lessonSubjects.map((ls) => (
                      <option key={ls.id} value={ls.name ?? ""}>{ls.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* ---- Microphone Color ---- */}
              <div className="space-y-2">
                <span className="block text-sm font-medium text-zinc-600 dark:text-zinc-400">Microphone</span>
                <div className="flex flex-wrap gap-2">
                  {micColors.map((c) => {
                    const isSelected = createForm.microphone_color_id === String(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCreateForm((f) => ({ ...f, microphone_color_id: String(c.id) }))}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-all duration-200 ${
                          isSelected
                            ? "border-sky-400 bg-sky-50 font-medium text-sky-700 shadow-sm shadow-sky-500/10 ring-1 ring-sky-400 dark:border-sky-500 dark:bg-sky-900/30 dark:text-sky-300"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700/80"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full shadow-sm ring-1 ring-black/10 transition-transform ${isSelected ? "scale-110" : ""}`}
                          style={{ backgroundColor: c.color?.toLowerCase() ?? "transparent" }}
                        />
                        {c.color}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ---- File upload zones ---- */}
              <div className="grid grid-cols-2 gap-4">
                {/* Audio MP3 */}
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-6 text-center transition-all duration-200 ${
                    isDragging
                      ? "border-sky-400 bg-sky-50/80 shadow-inner dark:border-sky-500 dark:bg-sky-900/20"
                      : audioFile
                        ? "border-emerald-400 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-900/20"
                        : "border-zinc-200 bg-zinc-50/50 hover:border-sky-300 hover:bg-sky-50/30 dark:border-zinc-700 dark:bg-zinc-800/30 dark:hover:border-sky-600 dark:hover:bg-sky-900/10"
                  }`}
                >
                  {audioFile ? (
                    <>
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                        <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-full">{audioFile.name}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-400">{(audioFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAudioFile(null); }}
                        className="mt-1.5 cursor-pointer text-[10px] font-medium text-zinc-400 underline decoration-zinc-300 underline-offset-2 hover:text-red-500 hover:decoration-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 transition-colors group-hover:bg-sky-100 dark:bg-zinc-800 dark:group-hover:bg-sky-900/30">
                        <svg className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3.75 3.75 0 013.57 5.595H6.75z" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Audio</p>
                      <p className="mt-0.5 text-[10px] text-zinc-400">.mp3 · Drop or click</p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept=".mp3,audio/mpeg" onChange={onFileSelect} className="hidden" />
                </div>

                {/* Transcript TXT */}
                <div
                  onDragOver={onDragOverTranscript}
                  onDragLeave={onDragLeaveTranscript}
                  onDrop={onDropTranscript}
                  onClick={() => transcriptFileInputRef.current?.click()}
                  className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-6 text-center transition-all duration-200 ${
                    isDraggingTranscript
                      ? "border-sky-400 bg-sky-50/80 shadow-inner dark:border-sky-500 dark:bg-sky-900/20"
                      : transcriptFile
                        ? "border-emerald-400 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-900/20"
                        : "border-zinc-200 bg-zinc-50/50 hover:border-sky-300 hover:bg-sky-50/30 dark:border-zinc-700 dark:bg-zinc-800/30 dark:hover:border-sky-600 dark:hover:bg-sky-900/10"
                  }`}
                >
                  {transcriptFile ? (
                    <>
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                        <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-full">{transcriptFile.name}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-400">{(transcriptFile.size / 1024).toFixed(1)} KB</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setTranscriptFile(null); }}
                        className="mt-1.5 cursor-pointer text-[10px] font-medium text-zinc-400 underline decoration-zinc-300 underline-offset-2 hover:text-red-500 hover:decoration-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 transition-colors group-hover:bg-sky-100 dark:bg-zinc-800 dark:group-hover:bg-sky-900/30">
                        <svg className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Transcript</p>
                      <p className="mt-0.5 text-[10px] text-zinc-400">.txt · Drop or click</p>
                    </>
                  )}
                  <input ref={transcriptFileInputRef} type="file" accept=".txt,text/plain" onChange={onTranscriptFileSelect} className="hidden" />
                </div>
              </div>

              {uploadStep === "error" && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {uploadMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setUploadForParticipant(null)}
                  className="cursor-pointer rounded-lg px-5 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!audioFile || !transcriptFile}
                  className="cursor-pointer rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 px-8 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/20 transition-all hover:shadow-lg hover:shadow-sky-500/30 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100 dark:focus:ring-offset-zinc-900"
                >
                  Upload
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* ---- Add Participant dialog ---- */}
      {showAddParticipant && (
        <div className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="animate-modal-slide-up w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
            <div className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-500 px-6 py-4">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <h3 className="relative text-center text-lg font-semibold tracking-tight text-white">
                Add Participant
              </h3>
              <button
                type="button"
                onClick={() => setShowAddParticipant(false)}
                disabled={isAddingParticipant}
                aria-label="Close"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 text-sm leading-none text-white/90 backdrop-blur-sm transition-all hover:bg-white/25 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddParticipant} className="space-y-4 p-5">
              <label className="block space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Name *</span>
                <input
                  type="text"
                  required
                  value={addParticipantForm.name}
                  onChange={(e) =>
                    setAddParticipantForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Role</span>
                <select
                  value={addParticipantForm.role}
                  onChange={(e) =>
                    setAddParticipantForm((f) => ({ ...f, role: e.target.value }))
                  }
                  className="w-full cursor-pointer rounded border border-zinc-300 bg-white px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <option value="">— Select —</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Pre-Service">Pre-Service</option>
                  <option value="Post-Service">Post-Service</option>
                </select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Description</span>
                <textarea
                  rows={2}
                  value={addParticipantForm.description}
                  onChange={(e) =>
                    setAddParticipantForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Join Date</span>
                <input
                  type="date"
                  value={addParticipantForm.join_date}
                  onChange={(e) =>
                    setAddParticipantForm((f) => ({ ...f, join_date: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddParticipant(false)}
                  disabled={isAddingParticipant}
                  className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingParticipant}
                  className="cursor-pointer rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAddingParticipant ? "Creating…" : "Add Participant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Delete confirmation dialog ---- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="bg-red-600 px-5 py-3">
              <h3 className="text-center text-lg font-semibold text-white">
                Delete Transcript
              </h3>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Are you sure you want to delete{" "}
                <span className="font-semibold">{deleteTarget.title ?? `Transcript #${deleteTarget.id}`}</span>?
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                This will remove the transcript entry and all associated audio files. This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="cursor-pointer rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
    </RequirePermission>
  );
}
