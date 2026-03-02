"use client";

import { useEffect, useState, type FormEvent } from "react";

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
  first_name: string;
  last_name: string;
  display_name: string;
  active: number;
};

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
type SampleCharacter = {
  first_name: string;
  last_name: string;
  alias: string;
  faction: "hero" | "villain";
};

const SAMPLE_CHARACTERS: SampleCharacter[] = [
  { first_name: "Peter", last_name: "Parker", alias: "Spider-Man", faction: "hero" },
  { first_name: "Bruce", last_name: "Wayne", alias: "Batman", faction: "hero" },
  { first_name: "Clark", last_name: "Kent", alias: "Superman", faction: "hero" },
  { first_name: "Diana", last_name: "Prince", alias: "Wonder Woman", faction: "hero" },
  { first_name: "Tony", last_name: "Stark", alias: "Iron Man", faction: "hero" },
  { first_name: "Steve", last_name: "Rogers", alias: "Captain America", faction: "hero" },
  { first_name: "Natasha", last_name: "Romanoff", alias: "Black Widow", faction: "hero" },
  { first_name: "Barry", last_name: "Allen", alias: "The Flash", faction: "hero" },
  { first_name: "Lex", last_name: "Luthor", alias: "Lex Luthor", faction: "villain" },
  { first_name: "Norman", last_name: "Osborn", alias: "Green Goblin", faction: "villain" },
  { first_name: "Otto", last_name: "Octavius", alias: "Doctor Octopus", faction: "villain" },
  { first_name: "Harley", last_name: "Quinn", alias: "Harley Quinn", faction: "villain" },
  { first_name: "Victor", last_name: "Doom", alias: "Doctor Doom", faction: "villain" },
  { first_name: "Loki", last_name: "Laufeyson", alias: "Loki", faction: "villain" },
  { first_name: "Thanos", last_name: "Titan", alias: "Thanos", faction: "villain" },
  { first_name: "Edward", last_name: "Nygma", alias: "The Riddler", faction: "villain" },
];

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildSampleUser(): CreateUserPayload {
  const character = randomFrom(SAMPLE_CHARACTERS);
  const userName = `${character.first_name}-${character.last_name}`.toLowerCase();

  return {
    user_name: userName,
    user_email: `${userName}@bridge-collab.com`,
    first_name: character.first_name,
    last_name: character.last_name,
    display_name: `${character.alias} (${character.faction})`,
    active: 1,
  };
}

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
  const [sampleUserCount, setSampleUserCount] = useState(5);
  const [isCreatingSampleUsers, setIsCreatingSampleUsers] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    user_name: "",
    user_email: "",
    first_name: "",
    last_name: "",
    display_name: "",
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

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsCreatingUser(true);

    try {
      const payload = {
        ...createForm,
        user_name: createForm.user_name.trim(),
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
      setCreateForm({
        user_name: "",
        user_email: "",
        first_name: "",
        last_name: "",
        display_name: "",
        active: 1,
      });

      await loadUsers(currentPage, pageSize, false);
    } catch {
      setError("Could not create user.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleCreateSampleUsers = async () => {
    const count = Math.min(25, Math.max(1, Math.floor(sampleUserCount || 1)));
    setIsCreatingSampleUsers(true);
    setError(null);

    try {
      const responses = await Promise.allSettled(
        Array.from({ length: count }, (_, index) =>
          fetch("/api/users", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(buildSampleUser()),
          })
        )
      );

      const successCount = responses.filter(
        (result) => result.status === "fulfilled" && result.value.ok
      ).length;

      if (successCount === 0) {
        throw new Error("No users created");
      }

      if (successCount < count) {
        setError(`Created ${successCount} of ${count} sample users.`);
      }

      await loadUsers(currentPage, pageSize, false);
    } catch {
      setError("Could not create sample users.");
    } finally {
      setIsCreatingSampleUsers(false);
    }
  };

  const firstEntryIndex = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastEntryIndex = Math.min(currentPage * pageSize, totalEntries);
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <section className="flex h-full min-h-0 flex-col space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Users</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
            <label htmlFor="sample-user-count" className="text-sm text-zinc-600 dark:text-zinc-300">
              Sample count
            </label>
            <input
              id="sample-user-count"
              type="number"
              min={1}
              max={25}
              value={sampleUserCount}
              onChange={(event) => setSampleUserCount(Number(event.target.value))}
              className="w-16 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </div>

          <button
            type="button"
            onClick={handleCreateSampleUsers}
            disabled={isCreatingSampleUsers}
            className="cursor-pointer rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreatingSampleUsers ? "Creating..." : "Create Sample Users"}
          </button>

          <button
            type="button"
            onClick={() => setIsAddUserOpen(true)}
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
                  "
                  {pendingDeleteUser.display_name ?? pendingDeleteUser.user_name ?? `#${pendingDeleteUser.id}`}
                  "
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
                onClick={() => setIsAddUserOpen(false)}
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

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
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
    </section>
  );
}
