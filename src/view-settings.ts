export const VIEW_SETTINGS_STORAGE_KEY = "hn-view-settings-v1";
// used b/c local storage's "storage" event doesn't broadcast in tab that writes the value
export const VIEW_SETTINGS_CHANGED_EVENT = "hn-view-settings-changed";
const VIEW_SETTINGS_CHANNEL = "hn-view-settings-channel";

// display order matches index order
export const VIEW_SETTING_DEFINITIONS = [
	{
		key: "roster",
		title: "Roster Columns",
		description:
			"Display Min/Max OVR columns on the roster tables. Disable to hide it.",
		defaultEnabled: true,
	},
	{
		key: "draftClass",
		title: "Draft Class Cards",
		description:
			"Display Min/Max OVR badges on draft class cards. Disable to hide it.",
		defaultEnabled: true,
	},
	{
		key: "draftRanking",
		title: "Draft Ranking Columns",
		description:
			"Display Min/Max OVR columns on draft ranking tables. Disable to hide it.",
		defaultEnabled: true,
	},
	{
		key: "freeAgentSearch",
		title: "Free Agent Search Cards",
		description:
			"Display Min/Max OVR badges on free agent search results. Disable to hide it.",
		defaultEnabled: true,
	},
	{
		key: "tradeCenter",
		title: "Trade Center Cards",
		description:
			"Display Min/Max OVR badges on trade center cards. Disable to hide it.",
		defaultEnabled: true,
	},
	{
		key: "coachingStaff",
		title: "Coaching Staff Columns",
		description:
			"Display Min/Max columns on coaching staff tables. Disable to hide it.",
		defaultEnabled: true,
	},
	{
		key: "coachMarket",
		title: "Coach Market Columns",
		description:
			"Display Min/Max columns on coach market tables. Disable to hide it.",
		defaultEnabled: true,
	},
] as const;

export type ViewSettingDefinition = (typeof VIEW_SETTING_DEFINITIONS)[number];
export type ViewSettingKey = ViewSettingDefinition["key"];
export type ViewSettings = Record<ViewSettingKey, boolean>;

// only store overrides and fill with defaults
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

	// notify current tab
	window.dispatchEvent(
		new CustomEvent(VIEW_SETTINGS_CHANGED_EVENT, {
			detail: { key, enabled, settings },
		}),
	);

	// notify other open tabs to refect the update
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
