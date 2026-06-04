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
