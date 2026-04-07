"use client";

import { useEffect, useState, type FormEvent } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type LessonSubject = {
  id: number;
  name: string | null;
  description: string | null;
  created: string | null;
  modified: string | null;
  active: number;
};

type LessonSubjectPayload = {
  name: string;
  description: string;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LessonSubjectsPage() {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <h2 className="text-2xl font-semibold">Lesson Subjects</h2>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
        <LessonSubjectsPanel />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Lesson Subjects Panel                                              */
/* ------------------------------------------------------------------ */

function LessonSubjectsPanel() {
  const [subjects, setSubjects] = useState<LessonSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* add dialog */
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<LessonSubjectPayload>({ name: "", description: "" });

  /* edit dialog */
  const [editingSubject, setEditingSubject] = useState<LessonSubject | null>(null);
  const [editForm, setEditForm] = useState<LessonSubjectPayload>({ name: "", description: "" });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  /* delete dialog */
  const [pendingDelete, setPendingDelete] = useState<LessonSubject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ---- data loading ---- */

  const loadSubjects = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/metadata/lesson-subjects");
      if (!res.ok) throw new Error();
      const data: LessonSubject[] = await res.json();
      setSubjects(data);
      setError(null);
    } catch {
      setError("Could not load lesson subjects.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  /* ---- create ---- */

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/metadata/lesson-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createForm.name.trim(), description: createForm.description.trim() }),
      });
      if (!res.ok) throw new Error();
      setIsAddOpen(false);
      setCreateForm({ name: "", description: "" });
      await loadSubjects(false);
    } catch {
      setError("Could not create lesson subject.");
    } finally {
      setIsCreating(false);
    }
  };

  /* ---- edit ---- */

  const openEdit = (item: LessonSubject) => {
    setEditingSubject(item);
    setEditForm({ name: item.name ?? "", description: item.description ?? "" });
  };

  const handleEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSubject) return;
    setIsSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/metadata/lesson-subjects/${editingSubject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name.trim(), description: editForm.description.trim() }),
      });
      if (!res.ok) throw new Error();
      setEditingSubject(null);
      await loadSubjects(false);
    } catch {
      setError("Could not update lesson subject.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  /* ---- delete ---- */

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/metadata/lesson-subjects/${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error();
      setPendingDelete(null);
      await loadSubjects(false);
    } catch {
      setError("Could not delete lesson subject.");
    } finally {
      setIsDeleting(false);
    }
  };

  /* ---- render ---- */

  return (
    <>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="cursor-pointer rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          Add Subject
        </button>
      </div>

      {loading && <p className="mt-2 text-sm text-zinc-500">Loading…</p>}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && !error && subjects.length === 0 && (
        <p className="mt-2 text-sm text-zinc-500">No lesson subjects found.</p>
      )}

      {!loading && !error && subjects.length > 0 && (
        <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <tr>
                <th className="whitespace-nowrap px-4 py-2 font-medium">ID</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium">Name</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium">Description</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium">Active</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium">Created</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {subjects.map((item) => (
                <tr key={item.id} className="bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60">
                  <td className="whitespace-nowrap px-4 py-2">{item.id}</td>
                  <td className="whitespace-nowrap px-4 py-2">{item.name ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2">{item.description ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.active
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      }`}
                    >
                      {item.active ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                    {item.created ? new Date(item.created).toLocaleDateString() : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        aria-label="Edit subject"
                        title="Edit subject"
                        className="cursor-pointer rounded px-2 py-1 text-zinc-500 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(item)}
                        aria-label="Delete subject"
                        title="Delete subject"
                        className="cursor-pointer rounded px-2 py-1 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Add dialog ---- */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="relative bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-3">
              <h3 className="text-center text-lg font-semibold text-white">Add Lesson Subject</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                disabled={isCreating}
                aria-label="Close"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-white/15 text-sm leading-none text-white/95 backdrop-blur-sm transition hover:bg-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-5">
              <label className="block space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Name</span>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Description</span>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  disabled={isCreating}
                  className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="cursor-pointer rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Edit dialog ---- */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="relative bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-3">
              <h3 className="text-center text-lg font-semibold text-white">Edit Lesson Subject</h3>
              <button
                type="button"
                onClick={() => setEditingSubject(null)}
                disabled={isSavingEdit}
                aria-label="Close"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-white/15 text-sm leading-none text-white/95 backdrop-blur-sm transition hover:bg-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4 p-5">
              <label className="block space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Name</span>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Description</span>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  disabled={isSavingEdit}
                  className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="cursor-pointer rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Delete confirmation ---- */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="relative bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-3">
              <h3 className="text-center text-lg font-semibold text-white">Delete Lesson Subject</h3>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={isDeleting}
                aria-label="Close"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-white/15 text-sm leading-none text-white/95 backdrop-blur-sm transition hover:bg-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ✕
              </button>
            </div>
            <div className="p-5 text-center">
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Are you sure you want to delete{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  &quot;{pendingDelete.name ?? `#${pendingDelete.id}`}&quot;
                </span>
                ?
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  disabled={isDeleting}
                  className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="cursor-pointer rounded bg-rose-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? "Deleting..." : "Yes, I am sure"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
