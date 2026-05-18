import {
	extensionRuntime,
	type FeatureDefinition,
	type MountedFeature,
	type ResourceStore,
} from "../runtime";
import { Roster } from "./roster";

type ScoutLevel = 0 | 1 | 2;

interface DraftClassResources {
	draftClass: Roster;
}

const DRAFT_CLASS_RESOURCE = "draftClass";
const DRAFT_CLASS_FEATURE_ID = "draft-class-badges";
const OWNED_SELECTOR = `[data-hn-feature="${DRAFT_CLASS_FEATURE_ID}"]`;

export const draftClassFeature: FeatureDefinition<DraftClassResources> = {
	id: DRAFT_CLASS_FEATURE_ID,
	route: (url) => url.pathname.startsWith("/office/draft-center"),
	target: {
		selector: ".stats-container",
		isReady: (root) =>
			!!root.querySelector('[id^="draftee-card"] a[href^="/player/"]') &&
			!!root.querySelector('[id^="draftee-card"] .badge'),
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
	const cards = root.querySelectorAll<HTMLElement>('[id^="draftee-card"]');

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
			player.getScoutLevel(),
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
			createRatingSpan(player.getMinOvr(), player.getScoutLevel()),
		);
		badgeGroup.appendChild(createOvrLabelSpan("MAX"));
		badgeGroup.appendChild(
			createRatingSpan(player.getMaxOvr(), player.getScoutLevel()),
		);
		badgeContainer.appendChild(badgeGroup);
	});
}

function clearDraftClassBadges(root: HTMLElement): void {
	root.querySelectorAll(OWNED_SELECTOR).forEach((el) => el.remove());
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

function createRatingSpan(ovr: number, scout: ScoutLevel): HTMLSpanElement {
	const ratingSpan = document.createElement("span");
	ratingSpan.dataset.hnFeature = DRAFT_CLASS_FEATURE_ID;

	if (scout === 1 || !ovr || ovr <= 0) {
		ratingSpan.innerText = "N/A";
		ratingSpan.style.color = "#FF2C2C";
		ratingSpan.style.textAlign = "center";
		ratingSpan.style.padding = ".25rem .375rem";
		ratingSpan.style.fontWeight = "600";
		return ratingSpan;
	}

	ratingSpan.classList.add("dynamic-ovr-badge", "badge", "ml-1");
	ratingSpan.style.userSelect = "none";
	ratingSpan.innerText = ovr.toString() + (scout === 2 ? "*" : "");

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
	extensionRuntime.setResource(DRAFT_CLASS_RESOURCE, new Roster(rosterData));
}
