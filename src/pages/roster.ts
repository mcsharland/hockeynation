import {
	extensionRuntime,
	type FeatureContext,
	type FeatureDefinition,
	type MountedFeature,
	type ResourceStore,
} from "../runtime";
import { Player } from "./player";

interface Players {
	[id: string]: Player;
}

type OvrType = "Default" | "Min" | "Max";

type ScoutLevel = 0 | 1 | 2;

interface RosterResources {
	roster: Roster;
}

interface RosterRow {
	playerId: string;
	player: Player;
	row: HTMLTableRowElement;
}

const ROSTER_RESOURCE = "roster";
const ROSTER_FEATURE_ID = "roster-min-max-columns";
const OWNED_SELECTOR = `[data-hn-feature="${ROSTER_FEATURE_ID}"]`;
const LEGACY_COLUMN_SELECTOR = `[data-column="min-ovr"], [data-column="max-ovr"]`;

export class Roster {
	private players: Players;

	constructor(data: any) {
		this.players = this.parseRosterData(data);
	}

	private parseRosterData(data: any): Players {
		const roster = {} as Players;

		for (const p of data.players) {
			roster[p.id] = new Player(p);
		}
		return roster;
	}

	public getPlayer(playerId: string): Player | undefined {
		return this.players[playerId];
	}

	public getAllPlayers(): Players {
		return this.players;
	}
}

export const rosterFeature: FeatureDefinition<RosterResources> = {
	id: ROSTER_FEATURE_ID,
	route: (url) => url.pathname.startsWith("/club/roster"),
	target: {
		selector: `table tbody a.player-link[href^="/player/"]`,
		resolveRoot: (match) => findRosterRoot(match),
		isReady: (root) => isRosterRootReady(root),
	},
	getResources: (resources) => getRosterResources(resources),
	mount: (context) => new RosterColumnsFeature(context),
};

class RosterColumnsFeature implements MountedFeature<RosterResources> {
	private root: HTMLElement;
	private roster: Roster;
	private lastSignature: string | null = null;

	constructor(context: FeatureContext<RosterResources>) {
		this.root = context.root;
		this.roster = context.resources.roster;
		this.render();
	}

	public update(context: FeatureContext<RosterResources>): void {
		this.root = context.root;
		this.roster = context.resources.roster;
		this.render();
	}

	public dispose(): void {
		clearRosterColumns(this.root);
		this.lastSignature = null;
	}

	private render(): void {
		const table = getRosterTable(this.root);
		const header = table?.querySelector<HTMLTableRowElement>("thead tr");
		const footer = table?.querySelector<HTMLTableRowElement>("tfoot tr");
		const tbody = table?.querySelector<HTMLTableSectionElement>("tbody");

		if (!table || !header || !tbody) {
			clearRosterColumns(this.root);
			this.lastSignature = null;
			return;
		}

		if (!isGeneralTabActive(this.root)) {
			const signature = "inactive";
			if (this.lastSignature === signature && !hasRosterColumns(this.root)) {
				return;
			}

			clearRosterColumns(this.root);
			this.lastSignature = signature;
			return;
		}

		if (!footer) {
			clearRosterColumns(this.root);
			this.lastSignature = null;
			return;
		}

		const rows = getRosterRows(tbody, this.roster);
		if (!rows.length) {
			clearRosterColumns(this.root);
			this.lastSignature = null;
			return;
		}

		const signature = getRosterSignature(rows, this.roster);
		if (
			this.lastSignature === signature &&
			hasCompleteRosterColumns(table, rows.length)
		) {
			return;
		}

		clearRosterColumns(this.root);
		renderRosterColumns(header, footer, rows, this.roster);
		this.lastSignature = signature;
	}
}

function getRosterResources(resources: ResourceStore): RosterResources | null {
	const roster = resources.get<Roster>(ROSTER_RESOURCE);
	return roster ? { roster } : null;
}

function findRosterRoot(match: HTMLElement): HTMLElement | null {
	const table = match.closest("table");
	if (!table) return null;

	let current = table.parentElement;
	while (current && current !== document.body) {
		if (current.querySelector(".btn-toggle") && current.contains(table)) {
			return current;
		}
		current = current.parentElement;
	}

	return table.parentElement;
}

function isRosterRootReady(root: HTMLElement): boolean {
	const table = getRosterTable(root);
	return (
		!!table?.querySelector(`tbody a.player-link[href^="/player/"]`) &&
		!!table?.querySelector("thead tr")
	);
}

function getRosterTable(root: HTMLElement): HTMLTableElement | null {
	return root.querySelector<HTMLTableElement>("table");
}

function isGeneralTabActive(root: HTMLElement): boolean {
	const tabButtons = Array.from(
		root.querySelectorAll<HTMLButtonElement>(".btn-toggle"),
	);
	if (tabButtons.length < 2) return true;

	const generalButton =
		tabButtons.find((button) => button.textContent?.trim() === "General") ??
		tabButtons[0];

	return generalButton.classList.contains("active");
}

function getRosterRows(
	tbody: HTMLTableSectionElement,
	roster: Roster,
): RosterRow[] {
	const rows: RosterRow[] = [];

	tbody.querySelectorAll<HTMLTableRowElement>("tr").forEach((row) => {
		const playerId = row
			.querySelector<HTMLAnchorElement>(`a.player-link[href^="/player/"]`)
			?.getAttribute("href")
			?.split("/")
			.pop();
		if (!playerId) return;

		const player = roster.getPlayer(playerId);
		if (!player) return;

		rows.push({ playerId, player, row });
	});

	return rows;
}

function getRosterSignature(rows: RosterRow[], roster: Roster): string {
	const playerSignature = rows
		.map(({ playerId, player }) =>
			[
				playerId,
				player.getMinOvr(),
				player.getMaxOvr(),
				player.getScoutLevel(),
			].join(":"),
		)
		.join("|");

	return [
		playerSignature,
		getRosterAvgOvr(roster, "Min"),
		getRosterAvgOvr(roster, "Max"),
	].join("::");
}

function hasRosterColumns(root: HTMLElement): boolean {
	return !!root.querySelector(`${OWNED_SELECTOR}, ${LEGACY_COLUMN_SELECTOR}`);
}

function hasCompleteRosterColumns(
	table: HTMLTableElement,
	rowCount: number,
): boolean {
	return table.querySelectorAll(OWNED_SELECTOR).length === rowCount * 2 + 4;
}

function clearRosterColumns(root: HTMLElement): void {
	root
		.querySelectorAll(`${OWNED_SELECTOR}, ${LEGACY_COLUMN_SELECTOR}`)
		.forEach((node) => node.remove());
}

function renderRosterColumns(
	header: HTMLTableRowElement,
	footer: HTMLTableRowElement,
	rows: RosterRow[],
	roster: Roster,
): void {
	rows.forEach(({ player, row }) => {
		row.appendChild(
			createDataCell("min-ovr", player.getMinOvr(), player.getScoutLevel()),
		);
		row.appendChild(
			createDataCell("max-ovr", player.getMaxOvr(), player.getScoutLevel()),
		);
	});

	header.appendChild(createHeaderCell("min-ovr", " Min "));
	header.appendChild(createHeaderCell("max-ovr", " Max "));

	footer.appendChild(
		createFooterCell("min-ovr", getRosterAvgOvr(roster, "Min")),
	);
	footer.appendChild(
		createFooterCell("max-ovr", getRosterAvgOvr(roster, "Max")),
	);
}

function createHeaderCell(column: string, label: string): HTMLTableCellElement {
	const cell = document.createElement("th");
	cell.className = "md:px-4 px-2 py-2 text-center sort-column";
	cell.innerText = label;
	cell.dataset.hnFeature = ROSTER_FEATURE_ID;
	cell.dataset.column = column;
	return cell;
}

function createFooterCell(column: string, ovr: number): HTMLTableCellElement {
	const cell = document.createElement("td");
	cell.className = "md:px-4 px-2 py-2 text-center";
	cell.dataset.hnFeature = ROSTER_FEATURE_ID;
	cell.dataset.column = column;
	cell.appendChild(createRatingSpan(ovr, 0));
	return cell;
}

function createDataCell(
	column: string,
	ovr: number,
	scout: ScoutLevel,
): HTMLTableCellElement {
	const cell = document.createElement("td");
	cell.className = "md:px-4 px-2 py-2 text-center";
	cell.dataset.hnFeature = ROSTER_FEATURE_ID;
	cell.dataset.column = column;
	cell.appendChild(createRatingSpan(ovr, scout));
	return cell;
}

function getRosterAvgOvr(roster: Roster, ovrType: OvrType): number {
	const playerOvr = {
		Default: (player: Player) => player.getOvr(),
		Min: (player: Player) => player.getMinOvr(),
		Max: (player: Player) => player.getMaxOvr(),
	};
	const players = roster.getAllPlayers();
	if (!players) return 0;

	const values = Object.values(players)
		.filter(
			(player) =>
				player && !(player.getScoutLevel() === 1) && player.getOvr() > 0,
		)
		.map((player) => playerOvr[ovrType](player));

	return values.length
		? Math.round(
				values.reduce((sum, value, _, array) => sum + value / array.length, 0),
			)
		: 0;
}

function createRatingSpan(ovr: number, scout: ScoutLevel): HTMLSpanElement {
	const ratingSpan: HTMLSpanElement = document.createElement("span");
	if (scout === 1 || !ovr || ovr <= 0) {
		ratingSpan.classList.add("question-mark");
		ratingSpan.innerText = "?";
		ratingSpan.style.color = "#bcbabe";
		ratingSpan.style.textAlign = "center";
		return ratingSpan;
	}

	ratingSpan.classList.add("badge");
	ratingSpan.style.userSelect = "none";
	ratingSpan.innerText = ovr.toString() + (scout === 2 ? "*" : "");

	if (window.userData && typeof window.userData.getColorPair === "function") {
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

export function handleRosterData(data: any) {
	extensionRuntime.setResource(ROSTER_RESOURCE, new Roster(data));
}
