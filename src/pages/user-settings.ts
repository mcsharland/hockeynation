import type {
	FeatureContext,
	FeatureDefinition,
	MountedFeature,
} from "../runtime";
import {
	isViewSettingEnabled,
	setViewSetting,
	VIEW_SETTING_DEFINITIONS,
	type ViewSettingDefinition,
	type ViewSettingKey,
} from "../view-settings";

interface UserSettingsResources {
	ready: true;
}

const USER_SETTINGS_FEATURE_ID = "user-settings-view-controls";
const OWNED_SELECTOR = `[data-hn-feature="${USER_SETTINGS_FEATURE_ID}"]`;
const ANCHOR_SETTING_TITLE = "Player/Coach OVR Calculator";
const PANEL_TITLE = "Miscellaneous Settings";

export const userSettingsFeature: FeatureDefinition<UserSettingsResources> = {
	id: USER_SETTINGS_FEATURE_ID,
	route: (url) => url.pathname.startsWith("/user"),
	target: {
		selector: ".border.border-gray-400",
		isReady: (root) =>
			hasText(root, PANEL_TITLE) &&
			!!findSettingRow(root, ANCHOR_SETTING_TITLE),
		getKey: () => "misc-settings",
	},
	getResources: () => ({ ready: true }),
	mount: (context) => new UserSettingsFeature(context),
};

class UserSettingsFeature implements MountedFeature<UserSettingsResources> {
	private root: HTMLElement;

	constructor(context: FeatureContext<UserSettingsResources>) {
		this.root = context.root;
		this.render();
	}

	public update(context: FeatureContext<UserSettingsResources>): void {
		this.root = context.root;
		this.render();
	}

	public dispose(): void {
		clearViewSettingRows(this.root);
	}

	private render(): void {
		clearViewSettingRows(this.root);

		const anchorRow = findSettingRow(this.root, ANCHOR_SETTING_TITLE);
		if (!anchorRow) return;

		let insertAfter = getSettingSection(anchorRow);
		for (const definition of VIEW_SETTING_DEFINITIONS) {
			const section = createSettingSection(definition);
			insertAfter.after(section);
			insertAfter = section;
		}
	}
}

function clearViewSettingRows(root: HTMLElement): void {
	root.querySelectorAll(OWNED_SELECTOR).forEach((node) => node.remove());
}

function findSettingRow(root: HTMLElement, title: string): HTMLElement | null {
	const titleElement = Array.from(
		root.querySelectorAll<HTMLElement>(".font-semibold"),
	).find((element) => getCleanText(element) === title);

	return titleElement?.closest<HTMLElement>(".flex.p-2") ?? null;
}

function hasText(root: HTMLElement, text: string): boolean {
	return getCleanText(root).includes(text);
}

function getSettingSection(row: HTMLElement): HTMLElement {
	const parent = row.parentElement;
	return parent?.classList.contains("divide-y") ? parent : row;
}

function createSettingSection(definition: ViewSettingDefinition): HTMLElement {
	const section = document.createElement("div");
	section.className = "divide-y divide-gray-400 divide-solid";
	section.dataset.hnFeature = USER_SETTINGS_FEATURE_ID;
	section.appendChild(createSettingRow(definition));
	return section;
}

function createSettingRow(definition: ViewSettingDefinition): HTMLElement {
	const row = document.createElement("div");
	row.className = "flex p-2 bg-gray-200 gap-2";

	const copy = document.createElement("div");
	copy.className = "flex-1";

	const title = document.createElement("div");
	title.className = "font-semibold";
	title.textContent = definition.title;

	const description = document.createElement("div");
	description.textContent = definition.description;

	copy.appendChild(title);
	copy.appendChild(description);

	const control = document.createElement("div");
	control.className = "flex items-center justify-center";
	control.appendChild(createToggle(definition.key));

	row.appendChild(copy);
	row.appendChild(control);

	return row;
}

function createToggle(key: ViewSettingKey): HTMLElement {
	const toggle = document.createElement("span");
	toggle.className = "v-toggle";
	toggle.role = "switch";
	toggle.tabIndex = 0;
	toggle.setAttribute("aria-readonly", "false");
	toggle.style.width = "4rem";
	toggle.style.height = "1.25rem";
	toggle.style.opacity = "1";
	toggle.style.cursor = "pointer";
	toggle.style.display = "flex";
	toggle.style.alignItems = "center";
	toggle.style.borderRadius = "9999px";
	toggle.style.overflow = "hidden";
	toggle.style.transition =
		"background-color ease .2s, width ease .2s, height ease .2s";

	const dot = document.createElement("span");
	dot.className = "v-toggle-dot";
	dot.setAttribute("aria-hidden", "true");
	dot.style.background = "rgb(255, 255, 255)";
	dot.style.width = "1rem";
	dot.style.height = "1rem";
	dot.style.minWidth = "1rem";
	dot.style.minHeight = "1rem";
	dot.style.borderRadius = "9999px";
	dot.style.transition = "margin-left ease .2s";

	toggle.appendChild(dot);
	updateToggleVisual(toggle, isViewSettingEnabled(key));

	const toggleSetting = () => {
		const nextValue = !isViewSettingEnabled(key);
		updateToggleVisual(toggle, nextValue);
		setViewSetting(key, nextValue);
	};

	toggle.addEventListener("click", toggleSetting);
	toggle.addEventListener("keydown", (event) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		toggleSetting();
	});

	return toggle;
}

function updateToggleVisual(toggle: HTMLElement, enabled: boolean): void {
	toggle.setAttribute("aria-checked", String(enabled));
	toggle.style.background = enabled
		? "rgb(16, 185, 129)"
		: "rgb(156, 163, 175)";

	const dot = toggle.querySelector<HTMLElement>(".v-toggle-dot");
	if (dot) {
		dot.style.marginLeft = enabled ? "2.75rem" : ".25rem";
	}
}

function getCleanText(element: HTMLElement): string {
	return element.textContent?.replace(/\s+/g, " ").trim() ?? "";
}
