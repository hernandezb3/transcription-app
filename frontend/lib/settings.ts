import localSettings from "@/settings.local.json";
import liveSettings from "@/settings.live.json";

const appEnv = (process.env.APP_ENVIRONMENT ?? "local").toLowerCase();

const settingsByEnv = {
	local: localSettings,
	live: liveSettings,
} as const;

const selectedSettings = settingsByEnv[appEnv as keyof typeof settingsByEnv];

if (!selectedSettings) {
	throw new Error(`No settings file configured for environment: ${appEnv}`);
}

export const settings = selectedSettings;
