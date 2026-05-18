export const VIEW_SETTINGS_STORAGE_KEY = "hn-view-settings-v1";
export const VIEW_SETTINGS_CHANGED_EVENT = "hn-view-settings-changed";
const VIEW_SETTINGS_CHANNEL = "hn-view-settings-channel";

export const VIEW_SETTING_DEFINITIONS = [
	{
		key: "roster",
		title: "Roster Columns",
		description: "Show projected overall columns on roster tables.",
		defaultEnabled: true,
	},
	{
		key: "draftClass",
		title: "Draft Class Cards",
		description: "Show projected overall badges on draft class cards.",
		defaultEnabled: true,
	},
	{
		key: "draftRanking",
		title: "Draft Ranking Columns",
		description: "Show projected overall columns on draft ranking tables.",
		defaultEnabled: true,
	},
	{
		key: "freeAgentSearch",
		title: "Free Agent Search Cards",
		description: "Show projected overall badges on free agent search results.",
		defaultEnabled: true,
	},
	{
		key: "tradeCenter",
		title: "Trade Center Cards",
		description: "Show projected overall badges on trade center cards.",
		defaultEnabled: true,
	},
	{
		key: "coachingStaff",
		title: "Coaching Staff Columns",
		description: "Show projected overall columns on coaching staff tables.",
		defaultEnabled: true,
	},
	{
		key: "coachMarket",
		title: "Coach Market Columns",
		description: "Show projected overall columns on coach market tables.",
		defaultEnabled: true,
	},
] as const;

export type ViewSettingDefinition = (typeof VIEW_SETTING_DEFINITIONS)[number];
export type ViewSettingKey = ViewSettingDefinition["key"];
export type ViewSettings = Record<ViewSettingKey, boolean>;

export function getViewSettings(): ViewSettings {
	return {
		...getDefaultViewSettings(),
		...readStoredViewSettings(),
	};
}

export function isViewSettingEnabled(key: ViewSettingKey): boolean {
	return getViewSettings()[key];
}

export function setViewSetting(key: ViewSettingKey, enabled: boolean): void {
	const settings = getViewSettings();
	settings[key] = enabled;

	try {
		localStorage.setItem(VIEW_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
	} catch (error) {
		console.error("Unable to save view settings:", error);
		return;
	}

	window.dispatchEvent(
		new CustomEvent(VIEW_SETTINGS_CHANGED_EVENT, {
			detail: { key, enabled, settings },
		}),
	);

	if ("BroadcastChannel" in window) {
		const channel = new BroadcastChannel(VIEW_SETTINGS_CHANNEL);
		channel.postMessage({ key, enabled });
		channel.close();
	}
}

export function onViewSettingsChanged(callback: () => void): () => void {
	const onCustomEvent = () => callback();
	const onStorageEvent = (event: StorageEvent) => {
		if (event.key === VIEW_SETTINGS_STORAGE_KEY) {
			callback();
		}
	};
	const channel =
		"BroadcastChannel" in window
			? new BroadcastChannel(VIEW_SETTINGS_CHANNEL)
			: null;
	const onChannelMessage = () => callback();

	window.addEventListener(VIEW_SETTINGS_CHANGED_EVENT, onCustomEvent);
	window.addEventListener("storage", onStorageEvent);
	channel?.addEventListener("message", onChannelMessage);

	return () => {
		window.removeEventListener(VIEW_SETTINGS_CHANGED_EVENT, onCustomEvent);
		window.removeEventListener("storage", onStorageEvent);
		channel?.removeEventListener("message", onChannelMessage);
		channel?.close();
	};
}

function getDefaultViewSettings(): ViewSettings {
	return VIEW_SETTING_DEFINITIONS.reduce((settings, definition) => {
		settings[definition.key] = definition.defaultEnabled;
		return settings;
	}, {} as ViewSettings);
}

function readStoredViewSettings(): Partial<ViewSettings> {
	try {
		const rawSettings = localStorage.getItem(VIEW_SETTINGS_STORAGE_KEY);
		if (!rawSettings) return {};

		const parsedSettings = JSON.parse(rawSettings) as unknown;
		if (!parsedSettings || typeof parsedSettings !== "object") return {};

		const storedSettings: Partial<ViewSettings> = {};
		for (const definition of VIEW_SETTING_DEFINITIONS) {
			const value = (parsedSettings as Record<string, unknown>)[definition.key];
			if (typeof value === "boolean") {
				storedSettings[definition.key] = value;
			}
		}

		return storedSettings;
	} catch (error) {
		console.error("Unable to load view settings:", error);
		return {};
	}
}
