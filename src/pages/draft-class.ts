// import { playerTooltipCache } from "../features/player-tooltip-cache";
import type { PlayerInfoVisibility } from "../player-data";
import {
	extensionRuntime,
	type FeatureDefinition,
	type MountedFeature,
	type ResourceStore,
} from "../runtime";
import { isViewSettingEnabled } from "../view-settings";
import { Roster } from "./roster";

interface DraftClassResources {
	draftClass: Roster;
}

const DRAFT_CLASS_RESOURCE = "draftClass";
const DRAFT_CLASS_FEATURE_ID = "draft-class-badges";
const OWNED_SELECTOR = `[data-hn-feature="${DRAFT_CLASS_FEATURE_ID}"]`;

export const draftClassFeature: FeatureDefinition<DraftClassResources> = {
	id: DRAFT_CLASS_FEATURE_ID,
	enabled: () => isViewSettingEnabled("draftClass"),
	route: (url) => url.pathname.startsWith("/office/draft-center"),
	target: {
		selector: `[id^="draftee-card"] a[href^="/player/"]`,
		resolveRoot: (match) => match.closest<HTMLElement>('[id^="draftee-card"]'),
		isReady: (root) =>
			!!root.querySelector('a[href^="/player/"]') &&
			!!root.querySelector(".badge"),
	},
	getResources: (resources) => getDraftClassResources(resources),
	mount: (context) => new DraftClassBadgesFeature(context),
};

class DraftClassBadgesFeature implements MountedFeature<DraftClassResources> {
	private root: HTMLElement;
	private draftClass: Roster;

	constructor(context: {
		root: HTMLElement;
		resources: DraftClassResources;
	}) {
		this.root = context.root;
		this.draftClass = context.resources.draftClass;
		this.render();
	}

	public update(context: {
		root: HTMLElement;
		resources: DraftClassResources;
	}): void {
		this.root = context.root;
		this.draftClass = context.resources.draftClass;
		this.render();
	}

	public dispose(): void {
		clearDraftClassBadges(this.root);
	}

	private render(): void {
		renderDraftClassBadges(this.root, this.draftClass);
	}
}

function getDraftClassResources(
	resources: ResourceStore,
): DraftClassResources | null {
	const draftClass = resources.get<Roster>(DRAFT_CLASS_RESOURCE);
	return draftClass ? { draftClass } : null;
}

function renderDraftClassBadges(root: HTMLElement, draftClass: Roster): void {
	const cards = getDraftClassCards(root);

	cards.forEach((card) => {
		card.removeAttribute("data-ovr-badges-added");

		const badgeContainer = card.querySelector(".badge")?.parentElement;
		if (!badgeContainer) return;

		const playerId = card
			.querySelector(`a[href^="/player/"]`)
			?.getAttribute("href")
			?.split("/")
			.pop();

		if (!playerId) return;

		const player = draftClass.getPlayer(playerId);
		if (!player) return;

		const signature = [
			playerId,
			player.getMinOvr(),
			player.getMaxOvr(),
			player.getInfoVisibility(),
		].join(":");

		const existingBadgeGroup =
			badgeContainer.querySelector<HTMLElement>(OWNED_SELECTOR);
		if (existingBadgeGroup?.dataset.hnSignature === signature) return;

		badgeContainer
			.querySelectorAll(
				`${OWNED_SELECTOR}, .dynamic-ovr-label, .dynamic-ovr-badge`,
			)
			.forEach((el) => el.remove());

		const badgeGroup = document.createElement("span");
		badgeGroup.dataset.hnFeature = DRAFT_CLASS_FEATURE_ID;
		badgeGroup.dataset.hnSignature = signature;
		badgeGroup.appendChild(createOvrLabelSpan("MIN"));
		badgeGroup.appendChild(
			createRatingSpan(player.getMinOvr(), player.getInfoVisibility()),
		);
		badgeGroup.appendChild(createOvrLabelSpan("MAX"));
		badgeGroup.appendChild(
			createRatingSpan(player.getMaxOvr(), player.getInfoVisibility()),
		);
		badgeContainer.appendChild(badgeGroup);
	});
}

function getDraftClassCards(root: HTMLElement): HTMLElement[] {
	const cards = Array.from(
		root.querySelectorAll<HTMLElement>('[id^="draftee-card"]'),
	);

	if (root.matches('[id^="draftee-card"]')) {
		cards.unshift(root);
	}

	return cards;
}

function clearDraftClassBadges(root: HTMLElement): void {
	root.querySelectorAll(OWNED_SELECTOR).forEach((el) => el.remove());
	root.removeAttribute("data-ovr-badges-added");
	root
		.querySelectorAll("[data-ovr-badges-added]")
		.forEach((el) => el.removeAttribute("data-ovr-badges-added"));
}

function createOvrLabelSpan(text: string): HTMLSpanElement {
	const label = document.createElement("span");
	label.dataset.hnFeature = DRAFT_CLASS_FEATURE_ID;
	label.classList.add(
		"dynamic-ovr-label",
		"uppercase",
		"ml-3",
		"xs:inline-block",
		"hidden",
	);
	label.innerText = text;
	return label;
}

function createRatingSpan(
	ovr: number,
	infoVisibility: PlayerInfoVisibility,
): HTMLSpanElement {
	const ratingSpan = document.createElement("span");
	ratingSpan.dataset.hnFeature = DRAFT_CLASS_FEATURE_ID;

	if (infoVisibility === "none" || !ovr || ovr <= 0) {
		ratingSpan.innerText = "N/A";
		ratingSpan.style.color = "#FF2C2C";
		ratingSpan.style.textAlign = "center";
		ratingSpan.style.padding = ".25rem .375rem";
		ratingSpan.style.fontWeight = "600";
		return ratingSpan;
	}

	ratingSpan.classList.add("dynamic-ovr-badge", "badge", "ml-1");
	ratingSpan.style.userSelect = "none";
	ratingSpan.innerText =
		ovr.toString() + (infoVisibility === "partial" ? "*" : "");

	if (
		window.userData &&
		typeof window.userData.getColorPair === "function" &&
		ovr > 0
	) {
		try {
			const [bgColor, color] = window.userData.getColorPair(ovr);
			ratingSpan.style.backgroundColor = bgColor;
			ratingSpan.style.color = color;
		} catch (e) {
			console.error("Error getting color pair for OVR:", ovr, e);
		}
	}

	return ratingSpan;
}

export function handleDraftClassData(data: any) {
	const rosterData = { ...data, players: data.draftees };
	// disabled on this page as it lacks experience information
	// playerTooltipCache.ingestPlayers(rosterData.players);
	extensionRuntime.setResource(DRAFT_CLASS_RESOURCE, new Roster(rosterData));
}
