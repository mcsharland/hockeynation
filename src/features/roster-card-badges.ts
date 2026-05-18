import type { Roster } from "../pages/roster";

interface RosterCardBadgesOptions {
	featureId: string;
	root: HTMLElement;
	roster: Roster;
	cardSelector: string;
	playerLinkSelector: string;
}

export function renderRosterCardBadges({
	featureId,
	root,
	roster,
	cardSelector,
	playerLinkSelector,
}: RosterCardBadgesOptions): void {
	const ownedSelector = getOwnedSelector(featureId);
	const cards = root.querySelectorAll<HTMLElement>(cardSelector);

	cards.forEach((card) => {
		card.removeAttribute("data-ovr-badges-added");

		const badgeContainer = card.querySelector(".badge")?.parentElement;
		if (!badgeContainer) return;

		const playerId = card
			.querySelector(playerLinkSelector)
			?.getAttribute("href")
			?.split("/")
			.pop();
		if (!playerId) return;

		const player = roster.getPlayer(playerId);
		if (!player) return;

		const signature = [playerId, player.getMinOvr(), player.getMaxOvr()].join(
			":",
		);

		const existingBadgeGroup =
			badgeContainer.querySelector<HTMLElement>(ownedSelector);
		if (existingBadgeGroup?.dataset.hnSignature === signature) return;

		badgeContainer
			.querySelectorAll(
				`${ownedSelector}, .dynamic-ovr-label, .dynamic-ovr-badge`,
			)
			.forEach((el) => el.remove());

		const badgeGroup = document.createElement("span");
		badgeGroup.dataset.hnFeature = featureId;
		badgeGroup.dataset.hnSignature = signature;
		badgeGroup.appendChild(createOvrLabelSpan(featureId, "MIN"));
		badgeGroup.appendChild(createRatingSpan(featureId, player.getMinOvr()));
		badgeGroup.appendChild(createOvrLabelSpan(featureId, "MAX"));
		badgeGroup.appendChild(createRatingSpan(featureId, player.getMaxOvr()));

		badgeContainer.appendChild(badgeGroup);
	});
}

export function clearRosterCardBadges(
	root: HTMLElement,
	featureId: string,
): void {
	root
		.querySelectorAll(getOwnedSelector(featureId))
		.forEach((el) => el.remove());
	root
		.querySelectorAll("[data-ovr-badges-added]")
		.forEach((el) => el.removeAttribute("data-ovr-badges-added"));
}

function getOwnedSelector(featureId: string): string {
	return `[data-hn-feature="${featureId}"]`;
}

function createOvrLabelSpan(featureId: string, text: string): HTMLSpanElement {
	const label = document.createElement("span");
	label.dataset.hnFeature = featureId;
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

function createRatingSpan(featureId: string, ovr: number): HTMLSpanElement {
	const ratingSpan = document.createElement("span");
	ratingSpan.dataset.hnFeature = featureId;
	ratingSpan.classList.add("dynamic-ovr-badge", "badge", "ml-1");
	ratingSpan.style.userSelect = "none";
	ratingSpan.innerText = ovr.toString();

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
