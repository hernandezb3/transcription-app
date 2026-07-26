"use client";

import { useEffect, useState, type FormEvent } from "react";
import RequirePermission from "@/app/components/require-permission";

type User = {
  id: number;
  unique_id: string | null;
  user_email: string | null;
  user_name: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  active: number;
  created: string;
  modified: string;
};

type PaginatedUsersResponse = {
  items: User[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

type CreateUserPayload = {
  user_name: string;
  user_email: string;
  password: string;
  first_name: string;
  last_name: string;
  display_name: string;
  active: number;
};

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const MIN_PASSWORD_LENGTH = 8;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInputValue, setPageInputValue] = useState("1");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    user_name: "",
    user_email: "",
    password: "",
    first_name: "",
    last_name: "",
    display_name: "",
    active: 1,
  });
  const [pendingResetUser, setPendingResetUser] = useState<User | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessUser, setResetSuccessUser] = useState<string | null>(null);
  const [resetForm, setResetForm] = useState({ password: "", confirm: "" });
  const [pendingEditUser, setPendingEditUser] = useState<User | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccessUser, setEditSuccessUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    display_name: "",
    user_email: "",
    active: 1,
  });

  const loadUsers = async (page: number, limit: number, showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/users?page=${page}&limit=${limit}`);
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const result: PaginatedUsersResponse = await response.json();
      const nextTotalPages = Math.max(1, result.total_pages ?? 1);

      if (page > nextTotalPages) {
        setCurrentPage(nextTotalPages);
        return;
      }

      setUsers(result.items ?? []);
      setTotalEntries(result.total ?? 0);
      setTotalPages(nextTotalPages);
      setError(null);
    } catch {
      setError("Could not load users.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadUsers(currentPage, pageSize);
  }, [currentPage, pageSize]);

  useEffect(() => {
    setPageInputValue(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    if (!resetSuccessUser) {
      return;
    }
    const timer = setTimeout(() => setResetSuccessUser(null), 4000);
    return () => clearTimeout(timer);
  }, [resetSuccessUser]);

  useEffect(() => {
    if (!editSuccessUser) {
      return;
    }
    const timer = setTimeout(() => setEditSuccessUser(null), 4000);
    return () => clearTimeout(timer);
  }, [editSuccessUser]);

  const goToTypedPage = () => {
    const parsedPage = Number(pageInputValue);
    if (!Number.isFinite(parsedPage)) {
      setPageInputValue(String(currentPage));
      return;
    }

    const nextPage = Math.min(Math.max(1, Math.floor(parsedPage)), totalPages);
    setCurrentPage(nextPage);
    setPageInputValue(String(nextPage));
  };

  const confirmDeleteUser = async (userId: number) => {
    setDeletingUserId(userId);
    setError(null);

    try {
      const response = await fetch(`/api/users/${userId}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      setPendingDeleteUser(null);

      const shouldMoveToPreviousPage = users.length === 1 && currentPage > 1;
      if (shouldMoveToPreviousPage) {
        setCurrentPage((previousPage) => Math.max(1, previousPage - 1));
      } else {
        await loadUsers(currentPage, pageSize, false);
      }
    } catch {
      setError("Could not delete user.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      user_name: "",
      user_email: "",
      password: "",
      first_name: "",
      last_name: "",
      display_name: "",
      active: 1,
    });
    setCreateError(null);
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    const userName = createForm.user_name.trim();
    if (!userName) {
      setCreateError("Username is required.");
      return;
    }
    if (createForm.password.length < MIN_PASSWORD_LENGTH) {
      setCreateError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setError(null);
    setIsCreatingUser(true);

    try {
      const payload = {
        ...createForm,
        user_name: userName,
        user_email: createForm.user_email.trim(),
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim(),
        display_name: createForm.display_name.trim(),
      };

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create user");
      }

      setIsAddUserOpen(false);
      resetCreateForm();

      await loadUsers(currentPage, pageSize, false);
    } catch {
      setCreateError("Could not create user.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const closeResetModal = () => {
    setPendingResetUser(null);
    setResetForm({ password: "", confirm: "" });
    setResetError(null);
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingResetUser) {
      return;
    }

    setResetError(null);

    if (resetForm.password.length < MIN_PASSWORD_LENGTH) {
      setResetError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (resetForm.password !== resetForm.confirm) {
      setResetError("Passwords do not match.");
      return;
    }

    const targetName =
      pendingResetUser.display_name ??
      pendingResetUser.user_name ??
      `#${pendingResetUser.id}`;

    setIsResettingPassword(true);

    try {
      const response = await fetch(`/api/users/${pendingResetUser.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: resetForm.password }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset password");
      }

      closeResetModal();
      setResetSuccessUser(targetName);
    } catch {
      setResetError("Could not reset password. Please try again.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const openEditModal = (user: User) => {
    setEditError(null);
    setEditForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      display_name: user.display_name ?? "",
      user_email: user.user_email ?? "",
      active: user.active ? 1 : 0,
    });
    setPendingEditUser(user);
  };

  const closeEditModal = () => {
    setPendingEditUser(null);
    setEditError(null);
  };

  const handleEditUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingEditUser) {
      return;
    }

    setEditError(null);

    const targetName =
      editForm.display_name.trim() ||
      pendingEditUser.user_name ||
      `#${pendingEditUser.id}`;

    setIsSavingEdit(true);

    try {
      const payload = {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        display_name: editForm.display_name.trim(),
        user_email: editForm.user_email.trim(),
        active: editForm.active,
      };

      const response = await fetch(`/api/users/${pendingEditUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      closeEditModal();
      setEditSuccessUser(targetName);
      await loadUsers(currentPage, pageSize, false);
    } catch {
      setEditError("Could not save changes. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const firstEntryIndex = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastEntryIndex = Math.min(currentPage * pageSize, totalEntries);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <RequirePermission permission="users.read">
    <section className="flex h-full min-h-0 flex-col space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Users</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setIsAddUserOpen(true);
            }}
            className="cursor-pointer rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Add User
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {resetSuccessUser && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200">
          <span>🔑 Password updated for “{resetSuccessUser}”.</span>
          <button
            type="button"
            onClick={() => setResetSuccessUser(null)}
            aria-label="Dismiss"
            className="cursor-pointer rounded px-1 text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
          >
            ✕
          </button>
        </div>
      )}
      {editSuccessUser && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200">
          <span>✅ Saved changes to “{editSuccessUser}”.</span>
          <button
            type="button"
            onClick={() => setEditSuccessUser(null)}
            aria-label="Dismiss"
            className="cursor-pointer rounded px-1 text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
          >
            ✕
          </button>
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <p className="text-sm text-zinc-500">No users found.</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col space-y-3">
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">ID</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Display Name</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Username</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Email</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">First Name</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Last Name</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Active</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Created</th>
                  <th className="whitespace-nowrap px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                  >
                    <td className="whitespace-nowrap px-4 py-2">{user.id}</td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {user.display_name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {user.user_name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {user.user_email ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {user.first_name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      {user.last_name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.active
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        }`}
                      >
                        {user.active ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                      {user.created
                        ? new Date(user.created).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          aria-label="Edit user"
                          title="Edit user"
                          className="cursor-pointer rounded px-2 py-1 text-base text-zinc-500 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetError(null);
                            setResetForm({ password: "", confirm: "" });
                            setPendingResetUser(user);
                          }}
                          aria-label="Reset password"
                          title="Reset password"
                          className="cursor-pointer rounded px-2 py-1 text-base text-zinc-500 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400"
                        >
                          🔑
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteUser(user)}
                          disabled={deletingUserId === user.id}
                          aria-label="Delete user"
                          title="Delete user"
                          className="cursor-pointer rounded px-2 py-1 text-base text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingUserId === user.id ? "…" : "🗑️"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sticky bottom-2 z-10 overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50/90 px-3 py-2 text-sm text-zinc-600 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
            <div className="flex min-w-[720px] flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
              <label htmlFor="users-page-size">Rows:</label>
              <select
                id="users-page-size"
                value={pageSize}
                onChange={(event) => {
                  const nextSize = Number(event.target.value);
                  setPageSize(nextSize);
                  setCurrentPage(1);
                }}
                className="cursor-pointer rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-zinc-500 dark:text-zinc-400">
                {firstEntryIndex}-{lastEntryIndex} of {totalEntries}
              </span>

              <div className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={!canGoPrevious}
                  aria-label="First page"
                  className="cursor-pointer rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ⏮
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((previousPage) => Math.max(1, previousPage - 1))}
                  disabled={!canGoPrevious}
                  aria-label="Previous page"
                  className="cursor-pointer rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ‹
                </button>

                <div className="flex items-center gap-1 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700">
                  <span>Page</span>
                  <input
                    id="users-page-input"
                    type="number"
                    min={1}
                    max={totalPages}
                    value={pageInputValue}
                    onChange={(event) => setPageInputValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        goToTypedPage();
                      }
                    }}
                    onBlur={goToTypedPage}
                    className="w-14 rounded border border-zinc-300 bg-white px-2 py-0.5 text-center text-zinc-700 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                  <span>of {totalPages}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((previousPage) => Math.min(totalPages, previousPage + 1))}
                  disabled={!canGoNext}
                  aria-label="Next page"
                  className="cursor-pointer rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ›
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={!canGoNext}
                  aria-label="Last page"
                  className="cursor-pointer rounded px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ⏭
                </button>
              </div>

              <span className="rounded-full bg-zinc-200 px-3 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {totalEntries} total entries
              </span>
            </div>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="relative bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-3">
              <h3 className="text-center text-lg font-semibold text-white">Delete User</h3>
              <button
                type="button"
                onClick={() => setPendingDeleteUser(null)}
                disabled={deletingUserId === pendingDeleteUser.id}
                aria-label="Close delete dialog"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-white/15 text-sm leading-none text-white/95 backdrop-blur-sm transition hover:bg-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ✕
              </button>
            </div>

            <div className="p-5 text-center">
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Are you sure you want to delete the user{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  &ldquo;
                  {pendingDeleteUser.display_name ?? pendingDeleteUser.user_name ?? `#${pendingDeleteUser.id}`}
                  &rdquo;
                </span>
                ?
              </p>

              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDeleteUser(null)}
                  disabled={deletingUserId === pendingDeleteUser.id}
                  className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => confirmDeleteUser(pendingDeleteUser.id)}
                  disabled={deletingUserId === pendingDeleteUser.id}
                  className="cursor-pointer rounded bg-rose-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingUserId === pendingDeleteUser.id ? "Deleting..." : "Yes, I am sure"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="relative bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-3">
              <h3 className="text-center text-lg font-semibold text-white">Add User</h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddUserOpen(false);
                  resetCreateForm();
                }}
                disabled={isCreatingUser}
                aria-label="Close add user dialog"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-white/15 text-sm leading-none text-white/95 backdrop-blur-sm transition hover:bg-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">Display Name</span>
                  <input
                    type="text"
                    value={createForm.display_name}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, display_name: event.target.value }))
                    }
                    className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">Username</span>
                  <input
                    type="text"
                    value={createForm.user_name}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, user_name: event.target.value }))
                    }
                    className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                </label>

                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-zinc-600 dark:text-zinc-300">Email</span>
                  <input
                    type="email"
                    value={createForm.user_email}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, user_email: event.target.value }))
                    }
                    className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                </label>

                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    Password <span className="text-zinc-400">(min {MIN_PASSWORD_LENGTH} characters — the user signs in with this)</span>
                  </span>
                  <input
                    type="password"
                    value={createForm.password}
                    autoComplete="new-password"
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, password: event.target.value }))
                    }
                    className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">First Name</span>
                  <input
                    type="text"
                    value={createForm.first_name}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, first_name: event.target.value }))
                    }
                    className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">Last Name</span>
                  <input
                    type="text"
                    value={createForm.last_name}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, last_name: event.target.value }))
                    }
                    className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={createForm.active === 1}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, active: event.target.checked ? 1 : 0 }))
                    }
                    className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-zinc-600 dark:text-zinc-300">Active</span>
                </label>
              </div>

              {createError && (
                <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddUserOpen(false);
                    resetCreateForm();
                  }}
                  disabled={isCreatingUser}
                  className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="cursor-pointer rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingUser ? "Saving..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="relative bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-3">
              <h3 className="text-center text-lg font-semibold text-white">Reset Password</h3>
              <button
                type="button"
                onClick={closeResetModal}
                disabled={isResettingPassword}
                aria-label="Close reset password dialog"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-white/15 text-sm leading-none text-white/95 backdrop-blur-sm transition hover:bg-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 p-5">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Set a new sign-in password for{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  “{pendingResetUser.display_name ?? pendingResetUser.user_name ?? `#${pendingResetUser.id}`}”
                </span>
                .
              </p>

              <label className="space-y-1 text-sm block">
                <span className="text-zinc-600 dark:text-zinc-300">
                  New Password <span className="text-zinc-400">(min {MIN_PASSWORD_LENGTH} characters)</span>
                </span>
                <input
                  type="password"
                  value={resetForm.password}
                  autoComplete="new-password"
                  autoFocus
                  onChange={(event) =>
                    setResetForm((current) => ({ ...current, password: event.target.value }))
                  }
                  className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </label>

              <label className="space-y-1 text-sm block">
                <span className="text-zinc-600 dark:text-zinc-300">Confirm Password</span>
                <input
                  type="password"
                  value={resetForm.confirm}
                  autoComplete="new-password"
                  onChange={(event) =>
                    setResetForm((current) => ({ ...current, confirm: event.target.value }))
                  }
                  className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </label>

              {resetError && (
                <p className="text-sm text-red-600 dark:text-red-400">{resetError}</p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeResetModal}
                  disabled={isResettingPassword}
                  className="cursor-pointer rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="cursor-pointer rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResettingPassword ? "Saving..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
            <div className="relative bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-3">
              <h3 className="text-center text-lg font-semibold text-white">Edit User</h3>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSavingEdit}
                aria-label="Close edit user dialog"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/35 bg-white/15 text-sm leading-none text-white/95 backdrop-blur-sm transition hover:bg-white/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4 p-5">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Editing{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {pendingEditUser.user_name ?? `#${pendingEditUser.id}`}
                </span>
                .
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-zinc-600 dark:text-zinc-300">Display Name</span>
                  <input
                    type="text"
                    value={editForm.display_name}
                    autoFocus
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, display_name: event.target.value }))
                    }
                    className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                </label>

                <label className="space-y-1 text-sm sm:col-span-2">
                  <span className="text-zinc-600 dark:text-zinc-300">Email</span>
                  <input
                    type="email"
                    value={editForm.user_email}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, user_email: event.target.value }))
                    }
                    className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">First Name</span>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, first_name: event.target.value }))
                    }
                    className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">Last Name</span>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, last_name: event.target.value }))
                    }
                    className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  />
                </label>

                <label className="flex items-start gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={editForm.active === 1}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, active: event.target.checked ? 1 : 0 }))
                    }
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-zinc-600 dark:text-zinc-300">
                    Active
                    <span className="block text-xs text-zinc-400">
                      Uncheck to disable this user’s sign-in without deleting the account.
                    </span>
                  </span>
                </label>
              </div>

              {editError && (
                <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
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
    </section>
    </RequirePermission>
  );
}
