import { getExperienceLabel } from "../mappings/experience-mappings";
import { NATION_INFO_BY_ID } from "../mappings/nation-mappings";
import { getSpecialSkillInfo } from "../mappings/special-skill-mappings";
import type {
	FeatureContext,
	FeatureDefinition,
	MountedFeature,
} from "../runtime";
import {
	type PlayerTooltipData,
	playerTooltipCache,
} from "./player-tooltip-cache";

interface PlayerTooltipResources {
	cache: typeof playerTooltipCache;
}

const PLAYER_TOOLTIP_FEATURE_ID = "player-tooltip";
const PLAYER_TOOLTIP_STYLE_ID = "hockey-nation-player-tooltip-styles";
const PLAYER_LINK_SELECTOR = `a[href^="/player/"], a[href*="/player/"]`;
const PLAYER_TOOLTIP_RIGHT_GAP_PX = 25;
const PLAYER_TOOLTIP_LEFT_GAP_PX = 8;
// placeholder for empty skill slots
const EMPTY_SPECIAL_SKILL_ICON_SVG =
	"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' style='height: 48px; width: 48px;'><defs><filter id='shadow-1' height='300%' width='300%' x='-100%' y='-100%'><feFlood flood-color='rgba(0, 0, 0, 1)' result='flood'></feFlood><feComposite in='flood' in2='SourceGraphic' operator='out' result='composite'></feComposite><feGaussianBlur in='composite' stdDeviation='4' result='blur'></feGaussianBlur><feOffset dx='2' dy='2' result='offset'></feOffset><feComposite in='offset' in2='SourceGraphic' operator='atop'></feComposite></filter></defs><rect fill='#1995ad' fill-opacity='1' height='512' width='512' rx='32' ry='32'></rect><g class='' transform='translate(0,0)' style=''><path d='M23.05 23.05V488.9H488.9V23.05H23.05z' fill='#fff' filter='url(#shadow-1)' fill-opacity='1'></path></g></svg>";
const EMPTY_SPECIAL_SKILL_ICON_SRC = `data:image/svg+xml,${encodeURIComponent(
	EMPTY_SPECIAL_SKILL_ICON_SVG,
)}`;

export const playerTooltipFeature: FeatureDefinition<PlayerTooltipResources> = {
	id: PLAYER_TOOLTIP_FEATURE_ID,
	route: () => true,
	target: {
		selector: "body",
		getKey: () => "document",
	},
	getResources: () => ({ cache: playerTooltipCache }),
	mount: (context) => new PlayerTooltipFeature(context),
};

class PlayerTooltipFeature implements MountedFeature<PlayerTooltipResources> {
	private cache: typeof playerTooltipCache;
	private card: HTMLDivElement | null = null;
	private miniTooltip: HTMLDivElement | null = null;
	private anchor: HTMLAnchorElement | null = null;
	private currentPlayerId: string | null = null;
	private hideTimer: number | null = null;
	private currentMiniTarget: HTMLElement | null = null;
	private nativeObserver: MutationObserver | null = null;
	private currentUrl = window.location.href;

	constructor(context: FeatureContext<PlayerTooltipResources>) {
		this.cache = context.resources.cache;
		ensureStyles();
		this.addListeners();
		this.observeNativePoppers();
	}

	public update(context: FeatureContext<PlayerTooltipResources>): void {
		this.cache = context.resources.cache;
		this.hideIfContextChanged();
	}

	public dispose(): void {
		this.removeListeners();
		this.nativeObserver?.disconnect();
		this.nativeObserver = null;
		this.hide();
	}

	private addListeners(): void {
		document.addEventListener("pointerover", this.handleTriggerEvent, true);
		document.addEventListener("pointerenter", this.handleTriggerEvent, true);
		document.addEventListener("mouseover", this.handleTriggerEvent, true);
		document.addEventListener("mouseenter", this.handleTriggerEvent, true);
		document.addEventListener("focusin", this.handleTriggerEvent, true);
		document.addEventListener("pointerout", this.handleTriggerLeave, true);
		document.addEventListener("mouseout", this.handleTriggerLeave, true);
		document.addEventListener("focusout", this.handleTriggerLeave, true);
		document.addEventListener(
			"pointerdown",
			this.handleDocumentPointerDown,
			true,
		);
		document.addEventListener("keydown", this.handleKeyDown, true);
		document.addEventListener("visibilitychange", this.handleVisibilityChanged);
		window.addEventListener("pagehide", this.handlePageHide);
		window.addEventListener("scroll", this.handleViewportChanged, true);
		window.addEventListener("resize", this.handleViewportChanged);
	}

	private removeListeners(): void {
		document.removeEventListener("pointerover", this.handleTriggerEvent, true);
		document.removeEventListener("pointerenter", this.handleTriggerEvent, true);
		document.removeEventListener("mouseover", this.handleTriggerEvent, true);
		document.removeEventListener("mouseenter", this.handleTriggerEvent, true);
		document.removeEventListener("focusin", this.handleTriggerEvent, true);
		document.removeEventListener("pointerout", this.handleTriggerLeave, true);
		document.removeEventListener("mouseout", this.handleTriggerLeave, true);
		document.removeEventListener("focusout", this.handleTriggerLeave, true);
		document.removeEventListener(
			"pointerdown",
			this.handleDocumentPointerDown,
			true,
		);
		document.removeEventListener("keydown", this.handleKeyDown, true);
		document.removeEventListener(
			"visibilitychange",
			this.handleVisibilityChanged,
		);
		window.removeEventListener("pagehide", this.handlePageHide);
		window.removeEventListener("scroll", this.handleViewportChanged, true);
		window.removeEventListener("resize", this.handleViewportChanged);
	}

	private handleTriggerEvent = (event: Event): void => {
		const anchor = getPlayerLinkFromEvent(event);
		if (!anchor) return;

		const playerId = getPlayerId(anchor);
		if (!playerId) return;

		const player = this.cache.getPlayer(playerId);
		if (!player) return;

		stopNativeTooltipEvent(event);
		removeNativePoppers();
		this.show(anchor, player);
	};

	private handleTriggerLeave = (event: Event): void => {
		const anchor = getPlayerLinkFromEvent(event);
		if (!anchor || anchor !== this.anchor) return;

		const relatedTarget = getRelatedTarget(event);
		if (
			relatedTarget &&
			(anchor.contains(relatedTarget) || this.card?.contains(relatedTarget))
		) {
			return;
		}

		this.scheduleHide();
	};

	private handleDocumentPointerDown = (event: Event): void => {
		const target = event.target;
		if (!(target instanceof Node)) return;
		if (this.card?.contains(target) || this.anchor?.contains(target)) return;
		this.hide();
	};

	private handleKeyDown = (event: KeyboardEvent): void => {
		if (event.key === "Escape") this.hide();
	};

	private handleVisibilityChanged = (): void => {
		if (document.hidden) this.hide();
	};

	private handlePageHide = (): void => {
		this.hide();
	};

	private handleViewportChanged = (): void => {
		this.positionCard();
		this.hideMiniTooltip();
	};

	private show(anchor: HTMLAnchorElement, player: PlayerTooltipData): void {
		this.clearHideTimer();
		this.anchor = anchor;
		this.currentPlayerId = player.id;
		this.currentUrl = window.location.href;
		this.hideMiniTooltip();

		const card = this.ensureCard();
		card.classList.toggle(
			"hn-player-tooltip-compact",
			!hasFullTooltipDetails(player),
		);
		card.replaceChildren(renderPlayerTooltip(player));
		card.hidden = false;
		this.positionCard();
		removeNativePoppers();
	}

	private hide(): void {
		this.clearHideTimer();
		this.hideMiniTooltip();
		this.card?.remove();
		this.card = null;
		this.anchor = null;
		this.currentPlayerId = null;
	}

	private scheduleHide = (): void => {
		this.clearHideTimer();
		this.hideTimer = window.setTimeout(() => this.hide(), 120);
	};

	private clearHideTimer = (): void => {
		if (this.hideTimer === null) return;
		window.clearTimeout(this.hideTimer);
		this.hideTimer = null;
	};

	private ensureCard(): HTMLDivElement {
		if (this.card) return this.card;

		const card = document.createElement("div");
		card.className = "hn-player-tooltip";
		card.dataset.hnFeature = PLAYER_TOOLTIP_FEATURE_ID;
		card.dataset.hnPlayerTooltip = "true";
		card.dataset.popperPlacement = "right";
		card.hidden = true;
		card.addEventListener("pointerenter", this.clearHideTimer);
		card.addEventListener("pointerleave", this.scheduleHide);
		card.addEventListener("mouseover", this.handleMiniTooltipOver);
		card.addEventListener("mouseout", this.handleMiniTooltipOut);
		document.body.append(card);
		this.card = card;
		return card;
	}

	private hideIfContextChanged(): void {
		const nextUrl = window.location.href;
		if (nextUrl !== this.currentUrl) {
			this.currentUrl = nextUrl;
			this.hide();
			return;
		}

		if (this.anchor && !this.anchor.isConnected) {
			this.hide();
		}
	}

	private positionCard(): void {
		if (!this.card || !this.anchor || this.card.hidden) return;
		if (!this.anchor.isConnected) {
			this.hide();
			return;
		}

		const margin = 8;
		const referenceRect = this.anchor.getBoundingClientRect();
		const rowRect = this.anchor.closest("tr")?.getBoundingClientRect();
		const verticalRect = rowRect ?? referenceRect;
		const cardRect = this.card.getBoundingClientRect();
		const viewportWidth = document.documentElement.clientWidth;
		const viewportHeight = document.documentElement.clientHeight;

		let left = referenceRect.right + PLAYER_TOOLTIP_RIGHT_GAP_PX;
		let placement = "right";
		if (left + cardRect.width > viewportWidth - margin) {
			left = referenceRect.left - cardRect.width - PLAYER_TOOLTIP_LEFT_GAP_PX;
			placement = "left";
		}
		left = Math.max(margin, left);

		let top = verticalRect.top + verticalRect.height / 2 - cardRect.height / 2;
		top = Math.max(
			margin,
			Math.min(top, viewportHeight - cardRect.height - margin),
		);

		this.card.style.position = "absolute";
		this.card.style.left = "";
		this.card.style.top = "";
		this.card.style.transform = `translate3d(${Math.round(
			left + window.scrollX,
		)}px, ${Math.round(top + window.scrollY)}px, 0px)`;
		this.card.dataset.popperPlacement = placement;
	}

	private observeNativePoppers(): void {
		if (this.nativeObserver || !document.body) return;

		this.nativeObserver = new MutationObserver(() => {
			if (this.anchor) removeNativePoppers();
		});
		this.nativeObserver.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	private handleMiniTooltipOver = (event: MouseEvent): void => {
		const target = getMiniTooltipTarget(event);
		if (!target || target === this.currentMiniTarget) return;
		this.showMiniTooltip(target);
	};

	private handleMiniTooltipOut = (event: MouseEvent): void => {
		if (!this.currentMiniTarget) return;
		const relatedTarget = event.relatedTarget;
		if (
			relatedTarget instanceof Node &&
			this.currentMiniTarget.contains(relatedTarget)
		) {
			return;
		}

		this.hideMiniTooltip();
	};

	private showMiniTooltip(target: HTMLElement): void {
		this.hideMiniTooltip();
		const title = target.dataset.hnTipTitle;
		if (!title) return;

		const description = target.dataset.hnTipDescription;
		const tooltip = document.createElement("div");
		tooltip.className = "hn-mini-tooltip";
		tooltip.dataset.hnFeature = PLAYER_TOOLTIP_FEATURE_ID;

		if (description) {
			const strong = document.createElement("strong");
			strong.textContent = title;
			tooltip.append(strong, document.createTextNode(` ${description}`));
		} else {
			tooltip.textContent = title;
		}

		document.body.append(tooltip);
		this.currentMiniTarget = target;
		this.miniTooltip = tooltip;
		positionMiniTooltip(target, tooltip);
	}

	private hideMiniTooltip(): void {
		this.miniTooltip?.remove();
		this.miniTooltip = null;
		this.currentMiniTarget = null;
	}
}

function renderPlayerTooltip(player: PlayerTooltipData): DocumentFragment {
	const fragment = document.createDocumentFragment();
	const shell = document.createElement("div");
	shell.className = "hn-player-tooltip-shell";

	const content = document.createElement("div");
	content.className = "hn-player-tooltip-inner-content";

	const card = document.createElement("div");
	card.className = "hn-player-tooltip-card";
	card.append(renderHeader(player), renderBody(player));

	content.append(card);
	shell.append(content);
	fragment.append(shell, renderArrow());
	return fragment;
}

function renderArrow(): HTMLElement {
	const container = document.createElement("div");
	container.className = "hn-player-tooltip-arrow-container";

	const outer = document.createElement("div");
	outer.className = "hn-player-tooltip-arrow-outer";

	const inner = document.createElement("div");
	inner.className = "hn-player-tooltip-arrow-inner";

	container.append(outer, inner);
	return container;
}

function renderHeader(player: PlayerTooltipData): HTMLElement {
	const header = document.createElement("div");
	header.className = "hn-player-tooltip-header";

	const row = document.createElement("div");
	row.className = "hn-player-tooltip-header-row";

	const flag = renderNationFlag(player);
	if (flag) row.append(flag);

	const nameLink = document.createElement("a");
	nameLink.className = "hn-player-tooltip-name";
	nameLink.href = `/player/${player.id}`;
	nameLink.textContent = player.fullName;

	const meta = document.createElement("span");
	meta.className = "hn-player-tooltip-meta";
	const positions = player.positions.join("/") || (player.isGoalie ? "G" : "");
	meta.append(
		document.createTextNode(`${positions} \u2022 ${player.age}y \u2022 `),
	);

	const xp = document.createElement("span");
	xp.className = "hn-player-tooltip-xp";
	xp.textContent = getExperienceLabel(player.xp);
	setMiniTooltip(xp, `Experience Level ${player.xp}/10`);
	meta.append(xp);

	const ratingWrap = document.createElement("div");
	ratingWrap.className = "hn-player-tooltip-rating-wrap";
	ratingWrap.append(renderRatingBadge(player));

	row.append(nameLink, meta, ratingWrap);
	header.append(row);

	return header;
}

function renderNationFlag(player: PlayerTooltipData): HTMLElement | null {
	if (!player.nationId) return null;

	const nation = NATION_INFO_BY_ID[player.nationId];
	const link = document.createElement("a");
	link.className = "hn-player-tooltip-flag-link";
	link.href = `/nation/overview/${player.nationId}`;

	if (nation) {
		const img = document.createElement("img");
		img.className = "hn-player-tooltip-flag";
		img.src = getExtensionAssetUrl(`images/flags/${nation.code}.png`);
		img.alt = nation.name;
		link.append(img);
		setMiniTooltip(link, nation.name);
	}

	return link;
}

function renderRatingBadge(player: PlayerTooltipData): HTMLElement {
	const badge = document.createElement("span");
	badge.className = "hn-player-tooltip-rating";

	if (player.rating <= 0) {
		badge.classList.add("hn-player-tooltip-rating-unknown");
		badge.textContent = "?";
		return badge;
	}

	badge.textContent = String(player.rating);

	if (window.userData && typeof window.userData.getColorPair === "function") {
		try {
			const [backgroundColor, color] = window.userData.getColorPair(
				player.rating,
			);
			badge.style.backgroundColor = backgroundColor;
			badge.style.color = color;
		} catch (error) {
			console.error("Error getting color pair for tooltip OVR:", error);
		}
	}

	return badge;
}

function renderBody(player: PlayerTooltipData): HTMLElement {
	if (!hasFullTooltipDetails(player)) return renderCompactBody();

	const body = document.createElement("div");
	body.className = "hn-player-tooltip-body";

	const content = document.createElement("div");
	content.className = "hn-player-tooltip-body-content";

	const top = document.createElement("div");
	top.className = "hn-player-tooltip-top";
	top.append(renderSkills(player), renderSpecialSkills(player));

	content.append(top, renderTalents(player));
	body.append(content);
	return body;
}

function renderCompactBody(): HTMLElement {
	const body = document.createElement("div");
	body.className = "hn-player-tooltip-body";

	const content = document.createElement("div");
	content.className = "hn-player-tooltip-body-content";

	const top = document.createElement("div");
	top.className = "hn-player-tooltip-top";

	const skills = document.createElement("div");
	skills.className = "hn-player-tooltip-skills";

	const specials = document.createElement("div");
	specials.className = "hn-player-tooltip-specials";

	const slots = document.createElement("div");
	slots.className = "hn-player-tooltip-special-slots";
	specials.append(slots);

	top.append(skills, specials);
	content.append(top);
	body.append(content);

	return body;
}

function hasFullTooltipDetails(player: PlayerTooltipData): boolean {
	// return player.infoVisibility === "full";
	return player.infoVisibility !== "none"; // show on partial players
}

function renderSkills(player: PlayerTooltipData): HTMLElement {
	const skills = document.createElement("div");
	skills.className = "hn-player-tooltip-skills";
	skills.style.setProperty("--hn-skill-count", String(player.skills.length));

	for (const skill of player.skills) {
		const item = document.createElement("div");
		item.className = "hn-player-tooltip-skill";

		const label = document.createElement("div");
		label.className = "hn-player-tooltip-skill-label";
		label.textContent = skill.id;

		const content = document.createElement("div");
		content.className = "hn-player-tooltip-skill-content";

		const value = document.createElement("span");
		value.className = `hn-player-tooltip-skill-value ${getSkillLevelClass(
			skill.rating,
		)}`;
		if (skill.max) value.classList.add("hn-player-tooltip-skill-max");
		if (skill.dec) value.classList.add("hn-player-tooltip-skill-dec");
		value.textContent = skill.hidden ? "?" : String(skill.rating);

		content.append(value);
		item.append(label, content);
		skills.append(item);
	}

	return skills;
}

function renderSpecialSkills(player: PlayerTooltipData): HTMLElement {
	const container = document.createElement("div");
	container.className = "hn-player-tooltip-specials";

	if (player.specialSkillCount === 0) {
		const empty = document.createElement("div");
		empty.className = "hn-player-tooltip-no-specials";
		empty.textContent = "No Special Skills";
		container.append(empty);
		return container;
	}

	const slots = document.createElement("div");
	slots.className = "hn-player-tooltip-special-slots";

	for (let index = 0; index < 3; index++) {
		const skillId = player.specialSkillIds[index];
		slots.append(skillId ? renderSpecialSkillSlot(skillId) : renderEmptySlot());
	}

	container.append(slots);
	return container;
}

function renderSpecialSkillSlot(skillId: string): HTMLElement {
	const info = getSpecialSkillInfo(skillId);
	const slot = document.createElement("div");
	slot.className = "hn-player-tooltip-special-slot";
	setMiniTooltip(slot, info.name, info.description);

	const icon = document.createElement("img");
	icon.className = "hn-player-tooltip-special-icon";
	icon.src = getExtensionAssetUrl(`images/special-skills/${skillId}.svg`);
	icon.alt = info.name;
	slot.append(icon);

	return slot;
}

function renderEmptySlot(): HTMLElement {
	const slot = document.createElement("span");
	slot.className =
		"hn-player-tooltip-special-slot hn-player-tooltip-special-slot-empty";
	setMiniTooltip(slot, "Empty");

	const icon = document.createElement("img");
	icon.className = "hn-player-tooltip-special-icon";
	icon.src = EMPTY_SPECIAL_SKILL_ICON_SRC;
	slot.append(icon);

	return slot;
}

function renderTalents(player: PlayerTooltipData): HTMLElement {
	const talents = document.createElement("div");
	talents.className = "hn-player-tooltip-talents";

	const strongest = player.talents?.strongest ?? [];
	if (strongest.length > 0) {
		const strongestLine = document.createElement("div");
		strongestLine.append(
			document.createTextNode(
				`Strongest talent${strongest.length === 1 ? " is " : "s are "}`,
			),
			renderStrongText(joinTalentNames(strongest)),
		);
		talents.append(strongestLine);
	}

	if (player.talents?.weakest) {
		const weakestLine = document.createElement("div");
		weakestLine.append(
			document.createTextNode("Weakest talent is "),
			renderStrongText(player.talents.weakest),
		);
		talents.append(weakestLine);
	}

	return talents;
}

function renderStrongText(text: string): HTMLElement {
	const strong = document.createElement("strong");
	strong.textContent = text;
	return strong;
}

function joinTalentNames(talents: string[]): string {
	if (talents.length <= 1) return talents[0] ?? "";
	return `${talents.slice(0, -1).join(", ")} and ${talents.at(-1)}`;
}

function getSkillLevelClass(rating: number): string {
	if (rating >= 10) return "hn-skill-level-elite";
	if (rating >= 9) return "hn-skill-level-outstanding";
	if (rating >= 8) return "hn-skill-level-excellent";
	if (rating >= 7) return "hn-skill-level-very-good";
	if (rating >= 5) return "hn-skill-level-solid";
	return "hn-skill-level-average";
}

function setMiniTooltip(
	element: HTMLElement,
	title: string,
	description?: string,
): void {
	element.dataset.hnTipTitle = title;
	if (description) element.dataset.hnTipDescription = description;
}

function getMiniTooltipTarget(event: MouseEvent): HTMLElement | null {
	const target = event.target;
	if (!(target instanceof Element)) return null;
	return target.closest<HTMLElement>("[data-hn-tip-title]");
}

function positionMiniTooltip(target: HTMLElement, tooltip: HTMLElement): void {
	const margin = 8;
	const gap = 10;
	const targetRect = target.getBoundingClientRect();
	const tooltipRect = tooltip.getBoundingClientRect();
	const viewportWidth = document.documentElement.clientWidth;

	let placement = "top";
	let top = targetRect.top - tooltipRect.height - gap;
	if (top < margin) {
		placement = "bottom";
		top = targetRect.bottom + gap;
	}

	let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
	if (left + tooltipRect.width > viewportWidth - margin) {
		left = viewportWidth - tooltipRect.width - margin;
	}
	left = Math.max(margin, left);

	tooltip.dataset.placement = placement;
	tooltip.style.left = `${Math.round(left)}px`;
	tooltip.style.top = `${Math.round(top)}px`;
}

function getPlayerLinkFromEvent(event: Event): HTMLAnchorElement | null {
	const target = event.target;
	if (!(target instanceof Element)) return null;
	if (target.closest("[data-hn-player-tooltip]")) return null;
	return target.closest<HTMLAnchorElement>(PLAYER_LINK_SELECTOR);
}

function getPlayerId(anchor: HTMLAnchorElement): string | null {
	const url = new URL(anchor.href, window.location.origin);
	const match = url.pathname.match(/^\/player\/([^/]+)/);
	return match?.[1] ?? null;
}

function getRelatedTarget(event: Event): Node | null {
	if ("relatedTarget" in event && event.relatedTarget instanceof Node) {
		return event.relatedTarget;
	}
	return null;
}

function stopNativeTooltipEvent(event: Event): void {
	event.preventDefault();
	event.stopPropagation();
	event.stopImmediatePropagation();
}

function removeNativePoppers(): void {
	document
		.querySelectorAll(".v-popper__popper:not([data-hn-player-tooltip])")
		.forEach((node) => node.remove());
}

function getExtensionAssetUrl(path: string): string {
	const cleanPath = path.replace(/^\/+/, "");

	if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
		try {
			return chrome.runtime.getURL(cleanPath);
		} catch (error) {
			// MAIN world may not have extension runtime access
		}
	}

	const baseUrl = document.documentElement.dataset.hnExtensionBaseUrl;
	return baseUrl ? new URL(cleanPath, baseUrl).toString() : cleanPath;
}

function ensureStyles(): void {
	if (document.getElementById(PLAYER_TOOLTIP_STYLE_ID)) return;

	const style = document.createElement("style");
	style.id = PLAYER_TOOLTIP_STYLE_ID;
	style.dataset.hnFeature = PLAYER_TOOLTIP_FEATURE_ID;
	// ripped from site styles
	// move later
	style.textContent = `
.hn-player-tooltip {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 2147483646;
	width: 364px;
	max-width: calc(100vw - 16px);
	background: transparent;
	color: #000;
	font-family: inherit;
	overflow: visible;
	font-size: 12px;
	line-height: 18px;
}

.hn-player-tooltip-compact {
	width: auto;
}

.hn-player-tooltip-arrow-container {
	position: absolute;
	top: 60px;
	left: 0;
	width: 10px;
	height: 10px;
	pointer-events: none;
}

.hn-player-tooltip-compact .hn-player-tooltip-arrow-container {
	top: 23px;
}

.hn-player-tooltip-arrow-outer,
.hn-player-tooltip-arrow-inner {
	border-style: solid;
	position: absolute;
	top: 0;
	left: 0;
	width: 0;
	height: 0;
}

.hn-player-tooltip-arrow-inner {
	border-width: 7px;
	border-color: rgb(85, 85, 85);
}

.hn-player-tooltip-arrow-outer {
	border-width: 6px;
	border-color: rgb(221, 221, 221);
}

.hn-player-tooltip[data-popper-placement^="right"] .hn-player-tooltip-arrow-inner,
.hn-player-tooltip[data-popper-placement^="right"] .hn-player-tooltip-arrow-outer {
	border-left-width: 0;
	border-left-color: transparent !important;
	border-top-color: transparent !important;
	border-bottom-color: transparent !important;
}

.hn-player-tooltip[data-popper-placement^="right"] .hn-player-tooltip-arrow-inner {
	top: -2px;
	left: -4px;
}

.hn-player-tooltip[data-popper-placement^="right"] .hn-player-tooltip-arrow-outer {
	top: -1px;
	left: -6px;
}

.hn-player-tooltip[data-popper-placement^="left"] .hn-player-tooltip-arrow-container {
	right: -10px;
	left: auto;
}

.hn-player-tooltip[data-popper-placement^="left"] .hn-player-tooltip-arrow-inner,
.hn-player-tooltip[data-popper-placement^="left"] .hn-player-tooltip-arrow-outer {
	border-right-width: 0;
	border-top-color: transparent !important;
	border-right-color: transparent !important;
	border-bottom-color: transparent !important;
}

.hn-player-tooltip[data-popper-placement^="left"] .hn-player-tooltip-arrow-inner {
	top: -2px;
	left: -2px;
}

.hn-player-tooltip[data-popper-placement^="left"] .hn-player-tooltip-arrow-outer {
	top: -1px;
}

.hn-player-tooltip-shell {
	box-sizing: border-box;
	width: 100%;
	overflow-y: auto;
	background: #fff;
	border: 1px solid #ddd;
	border-radius: 6px;
	box-shadow: 0 6px 30px rgba(0, 0, 0, 0.1);
}

.hn-player-tooltip-compact .hn-player-tooltip-shell {
	width: auto;
}

.hn-player-tooltip-inner-content {
	position: relative;
	z-index: 1;
	max-width: inherit;
	max-height: inherit;
}

.hn-player-tooltip-card {
	box-sizing: border-box;
	width: 100%;
	margin: 0;
	padding: 0;
	overflow: hidden;
	border-radius: 4px;
	background: rgb(248, 248, 249);
	box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px;
	font-size: 12px;
	line-height: 18px;
}

.hn-player-tooltip-compact .hn-player-tooltip-card {
	width: auto;
}

.hn-player-tooltip[hidden] {
	display: none;
}

.hn-player-tooltip a {
	text-decoration: none;
}

.hn-player-tooltip-header {
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	width: 100%;
	min-height: 38px;
	background: var(--bg-gray-400, rgb(208, 207, 210));
	color: var(--text-gray-700, rgb(113, 112, 114));
}

.hn-player-tooltip-header-row {
	box-sizing: border-box;
	display: flex;
	align-items: center;
	width: 100%;
	min-height: 38px;
	padding: 8px;
	text-align: left;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hn-player-tooltip-rating-wrap {
	display: inline-flex;
	flex: 1 1 0%;
	align-items: baseline;
	justify-content: flex-end;
	min-width: 0;
}

.hn-player-tooltip-flag-link {
	box-sizing: border-box;
	display: inline-flex;
	flex: 0 0 auto;
	align-items: center;
	width: 24px;
	margin-right: 8px;
	border: 0;
	border-radius: 2px;
	overflow: hidden;
	user-select: none;
}

.hn-player-tooltip-flag {
	width: 24px;
	height: 16px;
	display: block;
	object-fit: cover;
}

.hn-player-tooltip-name {
	display: block;
	flex: 0 1 auto;
	color: #0f8ca4;
	font-size: 12px;
	font-weight: 600;
	line-height: 18px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hn-player-tooltip-meta {
	color: #66666b;
	font-size: 12px;
	line-height: 18px;
	margin-left: 4px;
	white-space: nowrap;
}

.hn-player-tooltip-xp {
	cursor: default;
}

.hn-player-tooltip-rating {
	display: block;
	box-sizing: border-box;
	padding: 2px 8px;
	margin-left: 16px;
	border-radius: 999px;
	background: #1995ad;
	color: #f8f8f9;
	font-size: 12px;
	font-weight: 600;
	line-height: 18px;
	text-align: center;
	user-select: none;
}

.hn-player-tooltip-rating-unknown {
	background: var(--bg-gray-500, #bcbabe);
	color: var(--text-gray-100, #f8f8f9);
}

.hn-player-tooltip-body {
	box-sizing: border-box;
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
	padding: 8px;
	background: var(--bg-gray-200, rgb(238, 238, 239));
}

.hn-player-tooltip-body-content {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	align-items: flex-start;
	gap: 4px;
	min-width: 0;
}

.hn-player-tooltip-top {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 4px;
	width: 100%;
	min-width: 0;
}

.hn-player-tooltip-skills {
	display: flex;
	flex: 1 1 auto;
	align-items: flex-start;
	justify-content: flex-start;
	min-width: 0;
}

.hn-player-tooltip-skill {
	display: flex;
	flex-direction: column;
	padding-right: 4px;
}

.hn-player-tooltip-skill-label {
	color: var(--text-gray-700, #737378);
	font-family: "Ubuntu Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
	font-size: 12px;
	font-weight: 600;
	line-height: 1;
	text-align: center;
	text-transform: uppercase;
}

.hn-player-tooltip-skill-content {
	margin-top: 4px;
	margin-bottom: 4px;
	padding: 0;
	font-size: 14px;
	line-height: 21px;
	text-align: center;
}

.hn-player-tooltip-skill-value {
	display: inline;
	box-sizing: border-box;
	padding-right: 4px;
	padding-left: 4px;
	border-radius: 4px;
	color: var(--text-blue-400, #4db5c8);
	font-size: 14px;
	line-height: 21px;
	cursor: default;
}

.hn-skill-level-average {
	color: var(--text-blue-400, #4db5c8);
	font-weight: 400;
}

.hn-skill-level-solid {
	color: var(--text-blue-500, #2fa8be);
	font-weight: 500;
}

.hn-skill-level-very-good {
	color: var(--text-blue-600, #1594ad);
	font-weight: 500;
}

.hn-skill-level-excellent {
	color: var(--text-blue-600, #1594ad);
	font-weight: 600;
}

.hn-skill-level-outstanding {
	color: var(--text-blue-700, #0f5968);
	font-weight: 600;
}

.hn-skill-level-elite {
	padding-right: 2px;
	padding-left: 2px;
	color: var(--text-blue-800, #0b434e);
	font-weight: 700;
}

.hn-player-tooltip-skill-max {
	--tw-ring-color: var(--ring-red-400, #fc8181);
	--tw-ring-offset-width: 0px;
	--tw-ring-offset-color: #fff;
	--tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
	--tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
	background-color: var(--bg-gray-100, #f7f7f8);
	box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.hn-player-tooltip-skill-dec {
	background: #f86f79;
	border-color: #f86f79;
	color: #fff;
}

.hn-player-tooltip-specials {
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	flex: 0 0 auto;
	padding: 0 16px;
}

.hn-player-tooltip-special-slots {
	display: flex;
	align-items: center;
	justify-content: flex-start;
}

.hn-player-tooltip-special-slots > :not([hidden]) ~ :not([hidden]) {
	margin-left: 0.5rem;
}

.hn-player-tooltip-special-slot {
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	padding: 0;
	border: 0;
	border-radius: 4px;
	background: transparent;
	cursor: default;
	overflow: visible;
}

.hn-player-tooltip-special-slot-empty {
	display: block;
	opacity: 0.1;
}

.hn-player-tooltip-special-icon {
	display: block;
	width: 32px;
	height: 32px;
	object-fit: fill;
	overflow: clip;
}

.hn-player-tooltip-no-specials {
	box-sizing: border-box;
	display: block;
	flex: 0 0 112px;
	width: 112px;
	padding: 4px 0;
	margin-top: 1px;
	margin-bottom: 1px;
	border-radius: 4px;
	background-color: var(--bg-gray-500, #bcbcc2);
	color: var(--text-white, #fff);
	font-family: "Noto Sans", ui-sans-serif, system-ui, sans-serif;
	font-size: 12px;
	font-weight: 400;
	line-height: 18px;
	letter-spacing: -0.05em;
	text-align: center;
	text-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
	text-transform: uppercase;
	white-space: nowrap;
	user-select: none;
}

.hn-player-tooltip-talents {
	color: #050505;
	font-size: 9.6px;
	line-height: 14.4px;
}

.hn-player-tooltip-talents strong {
	font-weight: 800;
}

.hn-mini-tooltip {
	position: fixed;
	z-index: 2147483647;
	max-width: min(520px, calc(100vw - 16px));
	padding: 8px 10px;
	border-radius: 5px;
	background: #333338;
	color: #fff;
	box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
	font-size: 14px;
	line-height: 1.25;
	pointer-events: none;
	white-space: normal;
}

.hn-mini-tooltip strong {
	font-weight: 800;
}

.hn-mini-tooltip::after {
	content: "";
	position: absolute;
	left: 50%;
	bottom: -8px;
	transform: translateX(-50%);
	border-left: 9px solid transparent;
	border-right: 9px solid transparent;
	border-top: 9px solid #333338;
}

.hn-mini-tooltip[data-placement="bottom"]::after {
	top: -8px;
	bottom: auto;
	border-top: 0;
	border-bottom: 9px solid #333338;
}
`;

	(document.head || document.documentElement).append(style);
}
