"use client";

import { useEffect, useState, type FormEvent } from "react";
import RequirePermission from "@/app/components/require-permission";
import { useAuth } from "@/lib/auth-context";

type AzureOAuthSettings = {
  provider: string;
  tenant_id: string | null;
  client_id: string | null;
  redirect_uri: string | null;
  scopes: string | null;
  enabled: number;
  client_secret_set: boolean;
  client_secret_masked: string | null;
};

type FormState = {
  tenant_id: string;
  client_id: string;
  redirect_uri: string;
  scopes: string;
  enabled: number;
  client_secret: string;
};

const EMPTY_FORM: FormState = {
  tenant_id: "",
  client_id: "",
  redirect_uri: "",
  scopes: "",
  enabled: 0,
  client_secret: "",
};

function AzureOAuthForm() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("settings.write");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [secretSet, setSecretSet] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings/oauth/azure");
      if (!response.ok) {
        throw new Error("Failed to load settings");
      }
      const data: AzureOAuthSettings = await response.json();
      setForm({
        tenant_id: data.tenant_id ?? "",
        client_id: data.client_id ?? "",
        redirect_uri: data.redirect_uri ?? "",
        scopes: data.scopes ?? "",
        enabled: data.enabled ? 1 : 0,
        client_secret: "", // never populated — write-only
      });
      setSecretSet(Boolean(data.client_secret_set));
      setError(null);
    } catch {
      setError("Could not load Azure OAuth settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!saved) {
      return;
    }
    const timer = setTimeout(() => setSaved(false), 4000);
    return () => clearTimeout(timer);
  }, [saved]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) {
      return;
    }

    setError(null);
    setSaving(true);

    try {
      // Only send client_secret when the admin actually typed one; a blank field
      // means "keep the stored secret" (write-only) — don't overwrite it with "".
      const payload: Record<string, unknown> = {
        tenant_id: form.tenant_id.trim(),
        client_id: form.client_id.trim(),
        redirect_uri: form.redirect_uri.trim(),
        scopes: form.scopes.trim(),
        enabled: form.enabled,
      };
      if (form.client_secret.trim() !== "") {
        payload.client_secret = form.client_secret;
      }

      const response = await fetch("/api/settings/oauth/azure", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      const data: AzureOAuthSettings = await response.json();
      setSecretSet(Boolean(data.client_secret_set));
      setForm((current) => ({ ...current, client_secret: "" }));
      setSaved(true);
    } catch {
      setError("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Azure OAuth</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Configure the Microsoft Entra / Azure AD application used for OAuth sign-in.
          The client secret is stored encrypted and is never shown again after saving.
        </p>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {saved && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200">
          <span>✅ Azure OAuth settings saved.</span>
          <button
            type="button"
            onClick={() => setSaved(false)}
            aria-label="Dismiss"
            className="cursor-pointer rounded px-1 text-green-700 hover:text-green-900 dark:text-green-300 dark:hover:text-green-100"
          >
            ✕
          </button>
        </div>
      )}

      {!loading && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-md border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled === 1}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({ ...current, enabled: event.target.checked ? 1 : 0 }))
              }
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-zinc-300 text-sky-600 focus:ring-sky-500 disabled:cursor-not-allowed"
            />
            <span className="text-zinc-600 dark:text-zinc-300">
              Enabled
              <span className="block text-xs text-zinc-400">
                Turn Azure OAuth on once the application details below are configured.
              </span>
            </span>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">
              Tenant / Directory ID
            </span>
            <input
              type="text"
              value={form.tenant_id}
              disabled={!canEdit}
              placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(event) =>
                setForm((current) => ({ ...current, tenant_id: event.target.value }))
              }
              className="w-full rounded border border-zinc-300 px-2.5 py-2 font-mono text-zinc-800 focus:border-sky-500 focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">
              Client / Application ID
            </span>
            <input
              type="text"
              value={form.client_id}
              disabled={!canEdit}
              placeholder="00000000-0000-0000-0000-000000000000"
              onChange={(event) =>
                setForm((current) => ({ ...current, client_id: event.target.value }))
              }
              className="w-full rounded border border-zinc-300 px-2.5 py-2 font-mono text-zinc-800 focus:border-sky-500 focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">
              Client Secret{" "}
              <span className="text-zinc-400">
                {secretSet
                  ? "(a secret is configured — leave blank to keep it)"
                  : "(not set)"}
              </span>
            </span>
            <input
              type="password"
              value={form.client_secret}
              disabled={!canEdit}
              autoComplete="new-password"
              placeholder={secretSet ? "•••••••• (unchanged)" : "Enter client secret"}
              onChange={(event) =>
                setForm((current) => ({ ...current, client_secret: event.target.value }))
              }
              className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
            <span className="block text-xs text-zinc-400">
              Stored encrypted at rest and never displayed after saving.
            </span>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">Redirect URI</span>
            <input
              type="text"
              value={form.redirect_uri}
              disabled={!canEdit}
              placeholder="https://your-app/auth/callback"
              onChange={(event) =>
                setForm((current) => ({ ...current, redirect_uri: event.target.value }))
              }
              className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">
              Scopes <span className="text-zinc-400">(space-separated)</span>
            </span>
            <input
              type="text"
              value={form.scopes}
              disabled={!canEdit}
              placeholder="api://<client-id>/Full openid profile email"
              onChange={(event) =>
                setForm((current) => ({ ...current, scopes: event.target.value }))
              }
              className="w-full rounded border border-zinc-300 px-2.5 py-2 text-zinc-800 focus:border-sky-500 focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </label>

          {!canEdit && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              You can view these settings but need the “settings.write” permission to change them.
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={!canEdit || saving}
              className="cursor-pointer rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function AzureOAuthSettingsPage() {
  return (
    <RequirePermission permission="settings.read">
      <AzureOAuthForm />
    </RequirePermission>
  );
}
