import localSettings from "@/settings.local.json";
import liveSettings from "@/settings.live.json";

export const appEnv = (process.env.AppEnvironment ?? "local").toLowerCase();

const settingsByEnv = {
	local: localSettings,
	dev: localSettings,
	live: liveSettings,
	prod: liveSettings,
	public: liveSettings,
} as const;

const selectedSettings = settingsByEnv[appEnv as keyof typeof settingsByEnv];

if (!selectedSettings) {
	throw new Error(
		`No settings file configured for environment: ${appEnv}. Supported values: ${Object.keys(
			settingsByEnv
		).join(", ")}`
	);
}

export const settings = selectedSettings;

/**
 * Server-side base URL for the FastAPI backend. Overridable at runtime via the
 * API_BASE_URL env var (set in the Kubernetes Deployment to the in-cluster
 * service, e.g. http://transcription-api); otherwise falls back to the
 * per-environment settings file for local development. This is NOT exposed to
 * the browser — every backend call is proxied through Next.js route handlers.
 */
export const apiBaseUrl =
  process.env.API_BASE_URL ?? settings.api?.baseUrl ?? "";
