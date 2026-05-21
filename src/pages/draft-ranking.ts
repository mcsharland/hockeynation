// import { playerTooltipCache } from "../features/player-tooltip-cache";
import type { PlayerInfoVisibility } from "../player-data";
import {
	extensionRuntime,
	type FeatureContext,
	type FeatureDefinition,
	type MountedFeature,
	type ResourceStore,
} from "../runtime";
import { isViewSettingEnabled } from "../view-settings";
import { Roster } from "./roster";

interface DraftRankingResources {
	draftRanking: Roster;
	picks: number[];
}

interface DraftCards {
	[id: string]: HTMLTableRowElement;
}

const DRAFT_RANKING_RESOURCE = "draftRanking";
const DRAFT_RANKING_PICKS_RESOURCE = "draftRankingPicks";
const DRAFT_RANKING_FEATURE_ID = "draft-ranking-min-max-columns";
const OWNED_SELECTOR = `[data-hn-feature="${DRAFT_RANKING_FEATURE_ID}"]`;

export const draftRankingFeature: FeatureDefinition<DraftRankingResources> = {
	id: DRAFT_RANKING_FEATURE_ID,
	enabled: () => isViewSettingEnabled("draftRanking"),
	route: (url) => url.pathname.startsWith("/draft-ranking"),
	target: {
		selector: `table tbody a[href^="/player/"]`,
		resolveRoot: (match) => match.closest("table")?.parentElement ?? null,
		isReady: (root) => !!root.querySelector(`table tbody a[href^="/player/"]`),
	},
	getResources: (resources) => getDraftRankingResources(resources),
	mount: (context) => new DraftRankingMount(context),
};

class DraftRankingMount implements MountedFeature<DraftRankingResources> {
	private readonly visualizer = new DraftRankingVisualizer();
	private root: HTMLElement | null = null;
	private ranking: Roster | null = null;
	private picks: number[] | null = null;

	constructor(context: FeatureContext<DraftRankingResources>) {
		this.update(context);
	}

	public update(context: FeatureContext<DraftRankingResources>): void {
		const rootChanged = this.root !== context.root;
		const rankingChanged = this.ranking !== context.resources.draftRanking;
		const picksChanged = this.picks !== context.resources.picks;

		this.root = context.root;

		if (picksChanged) {
			this.picks = context.resources.picks;
		}

		if (rankingChanged) {
			this.ranking = context.resources.draftRanking;
			this.visualizer.updateRanking(context.resources.draftRanking);
		}

		if (rootChanged) {
			this.visualizer.attach(context.root);
		}
	}

	public dispose(): void {
		this.visualizer.detach();
		if (this.root) {
			this.root
				.querySelectorAll(OWNED_SELECTOR)
				.forEach((node) => node.remove());
		}
		this.root = null;
		this.ranking = null;
		this.picks = null;
	}
}

class DraftRankingVisualizer {
	private parent: HTMLElement | null = null;
	private draftRanking: Roster | null = null;
	private draftCards: DraftCards | null = null;
	private ovrTab: HTMLTableCellElement | null = null;
	private tableHR: HTMLTableRowElement | null = null;
	private tbody: HTMLTableElement | null = null;

	private dragStartListener: ((event: DragEvent) => void) | null = null;
	private dragEndListener: ((event: DragEvent) => void) | null = null;
	private rowMutationObserver: MutationObserver | null = null;

	public attach(el: HTMLElement) {
		this.detach();

		this.parent = el;

		if (this.parent && this.draftRanking) {
			this.initializeTableReferences();
			this.attachRowObserver();
			this.renderColumns();
		} else {
			this.detach();
		}
	}

	public detach() {
		if (!this.parent) return;

		if (this.tbody) {
			if (this.dragStartListener) {
				this.tbody.removeEventListener("dragstart", this.dragStartListener);
			}
			if (this.dragEndListener) {
				this.tbody.removeEventListener("dragend", this.dragEndListener);
			}
		}

		if (this.rowMutationObserver) this.rowMutationObserver.disconnect();

		this.parent = null;
		this.draftCards = null;
		this.ovrTab = null;
		this.tableHR = null;
		this.tbody = null;
	}

	public updateRanking(newRanking: Roster | null) {
		this.draftRanking = newRanking;
		if (this.parent && this.draftRanking) {
			this.initializeTableReferences();
			this.renderColumns();
		}
	}

	private initializeTableReferences() {
		if (!this.parent) return;

		this.tbody = this.parent.querySelector(`table`);
		this.tableHR = this.parent.querySelector(`table thead tr`);

		if (!this.tbody || !this.tableHR) return;

		this.ovrTab =
			(Array.from(this.tableHR.querySelectorAll(`th span`)).filter(
				(span) => span.textContent?.trim() === "OVR",
			)?.[0]?.parentElement as HTMLTableCellElement) ?? null;

		this.draftCards = {};

		const rows = this.tbody.querySelectorAll(`table tbody tr`);
		rows.forEach((row) => {
			const tableRow = row as HTMLTableRowElement;

			const playerLink = tableRow.querySelectorAll(`a`)[1];
			const href = playerLink?.getAttribute("href");
			if (href) {
				const playerId = href.split("/").pop() || "";
				if (playerId) {
					this.draftCards![playerId] = tableRow;
				}
			}
		});
	}

	private attachRowObserver() {
		if (!this.tableHR) return;

		this.rowMutationObserver = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === "childList") {
					mutation.addedNodes.forEach((node) => {
						if (node instanceof HTMLTableCellElement && node.tagName === "TH") {
							const span = node.querySelector("span");
							if (span?.textContent?.trim() === "OVR") {
								this.initializeTableReferences();
								this.renderColumns();
							}
						}
					});

					mutation.removedNodes.forEach((node) => {
						if (node instanceof HTMLTableCellElement && node.tagName === "TH") {
							const span = node.querySelector("span");
							if (span?.textContent?.trim() === "OVR") {
								this.removeColumns();
							}
						}
					});
				}
			});
		});

		this.rowMutationObserver.observe(this.tableHR, {
			childList: true,
		});
	}

	private removeColumns() {
		if (!this.parent) return;
		for (const node of this.parent.querySelectorAll("[data-column]")) {
			node.remove();
		}
	}

	private renderColumns() {
		if (
			!this.parent ||
			!this.draftRanking ||
			!this.tableHR ||
			!this.ovrTab ||
			!this.draftCards
		) {
			return;
		}

		this.removeColumns();

		const tabElement = this.ovrTab;
		const headerRow = tabElement.parentElement;
		if (!headerRow) return;
		const ovrIdx = Array.from(headerRow.children).indexOf(tabElement);

		const minHeader = this.createOvrLabelSpan("MIN");
		const maxHeader = this.createOvrLabelSpan("MAX");

		this.tableHR.insertBefore(maxHeader, this.ovrTab.nextSibling);
		this.tableHR.insertBefore(minHeader, this.ovrTab.nextSibling);

		Object.entries(this.draftCards).forEach(([playerId, row]) => {
			const player = this.draftRanking!.getPlayer(playerId);
			if (!player) return;

			const minDataCell = document.createElement("td");
			minDataCell.className = "px-4 text-center";
			minDataCell.dataset.hnFeature = DRAFT_RANKING_FEATURE_ID;
			minDataCell.dataset.column = "min-ovr";

			const maxDataCell = document.createElement("td");
			maxDataCell.className = "px-4 text-center";
			maxDataCell.dataset.hnFeature = DRAFT_RANKING_FEATURE_ID;
			maxDataCell.dataset.column = "max-ovr";

			minDataCell.appendChild(
				this.createRatingSpan(player.getMinOvr(), player.getInfoVisibility()),
			);
			maxDataCell.appendChild(
				this.createRatingSpan(player.getMaxOvr(), player.getInfoVisibility()),
			);

			row.insertBefore(maxDataCell, row.children[ovrIdx].nextSibling);
			row.insertBefore(minDataCell, row.children[ovrIdx].nextSibling);
		});
	}

	private createOvrLabelSpan(text: string): HTMLTableCellElement {
		const header = document.createElement("th");
		header.classList.add("px-4", "py-2");
		header.dataset.hnFeature = DRAFT_RANKING_FEATURE_ID;
		header.dataset.column = `${text.toLowerCase()}-ovr`;

		header.innerHTML = `<span>${text}</span>`;
		return header;
	}

	private createRatingSpan(
		ovr: number,
		infoVisibility: PlayerInfoVisibility,
	): HTMLSpanElement {
		const ratingSpan: HTMLSpanElement = document.createElement("span");
		if (infoVisibility === "none" || !ovr || ovr <= 0) {
			ratingSpan.innerText = "-";
			ratingSpan.style.color = "#555456";
			ratingSpan.style.textAlign = "center";
		} else {
			ratingSpan.classList.add("badge");
			ratingSpan.style.userSelect = "none";
			ratingSpan.innerText =
				ovr.toString() + (infoVisibility === "partial" ? "*" : "");

			if (
				window.userData &&
				typeof window.userData.getColorPair === "function"
			) {
				try {
					const [bgColor, color] = window.userData.getColorPair(ovr);
					ratingSpan.style.backgroundColor = bgColor;
					ratingSpan.style.color = color;
				} catch (e) {
					console.error("Error getting color pair for OVR:", ovr, e);
				}
			}
		}
		return ratingSpan;
	}
}

function getDraftRankingResources(
	resources: ResourceStore,
): DraftRankingResources | null {
	const draftRanking = resources.get<Roster>(DRAFT_RANKING_RESOURCE);
	if (!draftRanking) return null;

	return {
		draftRanking,
		picks: resources.get<number[]>(DRAFT_RANKING_PICKS_RESOURCE) ?? [],
	};
}

export function handleDraftRankingData(data: any) {
	// disabled on this page as it lacks experience information
	// playerTooltipCache.ingestPlayers(data);
	extensionRuntime.setResource(
		DRAFT_RANKING_RESOURCE,
		new Roster({ players: data }),
	);
}

export function handleDraftPickData(data: any) {
	const picks = data.map((pick: any) => pick.rank);
	extensionRuntime.setResource(DRAFT_RANKING_PICKS_RESOURCE, picks);
}
