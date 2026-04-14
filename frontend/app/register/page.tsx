"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { settings } from "@/lib/settings";

const API_BASE = settings.api?.baseUrl ?? "";

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    user_name: "",
    password: "",
    confirm_password: "",
    first_name: "",
    last_name: "",
    display_name: "",
    user_email: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: form.user_name,
          password: form.password,
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          display_name: form.display_name || undefined,
          user_email: form.user_email || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.detail ?? "Registration failed. Please try again.");
        return;
      }

      const data = await res.json();
      login({
        user_id: data.user_id,
        user_name: data.user_name,
        display_name: data.display_name ?? null,
        user_email: data.user_email ?? null,
        access_token: data.access_token,
      });
      router.replace("/");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Create an account
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Fill in the details below to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label
              htmlFor="user_name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Username <span className="text-red-500">*</span>
            </label>
            <input
              id="user_name"
              type="text"
              autoComplete="username"
              required
              value={form.user_name}
              onChange={set("user_name")}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              placeholder="Choose a username"
            />
          </div>

          {/* Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={set("password")}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label
                htmlFor="confirm_password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Confirm <span className="text-red-500">*</span>
              </label>
              <input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                required
                value={form.confirm_password}
                onChange={set("confirm_password")}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                placeholder="Re-enter password"
              />
            </div>
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="first_name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                First name
              </label>
              <input
                id="first_name"
                type="text"
                value={form.first_name}
                onChange={set("first_name")}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>
            <div>
              <label
                htmlFor="last_name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Last name
              </label>
              <input
                id="last_name"
                type="text"
                value={form.last_name}
                onChange={set("last_name")}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="display_name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Display name
            </label>
            <input
              id="display_name"
              type="text"
              value={form.display_name}
              onChange={set("display_name")}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              placeholder="How you'll appear to others"
            />
          </div>

          <div>
            <label
              htmlFor="user_email"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="user_email"
              type="email"
              autoComplete="email"
              value={form.user_email}
              onChange={set("user_email")}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
