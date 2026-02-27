"use client";

import { useEffect, useState } from "react";

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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const result: User[] = await response.json();
        setUsers(result);
      } catch {
        setError("Could not load users.");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Users</h2>
        <span className="rounded-full bg-zinc-200 px-3 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {users.length} total
        </span>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && users.length === 0 && (
        <p className="text-sm text-zinc-500">No users found.</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <tr>
                <th className="whitespace-nowrap px-4 py-2 font-medium">ID</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium">Display Name</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium">Username</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium">Email</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium">First Name</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium">Last Name</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium">Active</th>
                <th className="whitespace-nowrap px-4 py-2 font-medium">Created</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
