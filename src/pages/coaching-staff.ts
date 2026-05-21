// TODO: Accidentally selecting Interim page - improve selector to make it explicit
// Also breaks when navigating back from another page via back arrow, then selecting first tab, needs to be properly initialized
import {
	extensionRuntime,
	type FeatureContext,
	type FeatureDefinition,
	type MountedFeature,
	type ResourceStore,
} from "../runtime";
import { isViewSettingEnabled, onViewSettingsChanged } from "../view-settings";
import { Coach } from "./coach-market";

type TeamLevel = "PRO" | "FRM" | "U21" | "U17";

interface Coaches {
	[id: string]: Coach;
}

interface CoachesByTeam {
	[team: string]: Coaches;
}

interface CoachDataRow {
	[coachId: string]: HTMLTableRowElement;
}

interface ColumnGroupState {
	overallRating: boolean;
	trainingOvr: boolean;
	matchOvr: boolean;
}

interface CoachColumnDefinition {
	id: string;
	label: string;
	getValue: (coach: Coach) => number;
}

const MATCH_SKILL_IDS = ["OFP", "DFP", "BAT", "PP", "PK"];
const COACHING_STAFF_RESOURCE = "coachingStaff";
const COACHING_STAFF_FEATURE_ID = "coaching-staff-columns";
const COACHING_STAFF_MIN_MAX_STORAGE_KEY = "hn-coaching-staff-minmax";

interface CoachingStaffResources {
	coachingStaff: CoachingStaff;
}

export const coachingStaffFeature: FeatureDefinition<CoachingStaffResources> = {
	id: COACHING_STAFF_FEATURE_ID,
	route: (url) => url.pathname.startsWith("/coaching-staff"),
	target: {
		selector: `table tbody a.coach-link[href^="/coach/"]`,
		resolveRoot: (match) => findCoachingStaffRoot(match),
		isReady: (root) => isCoachingStaffRootReady(root),
	},
	getResources: (resources) => getCoachingStaffResources(resources),
	mount: (context) => new CoachingStaffFeatureInstance(context),
};

export class CoachingStaff {
	private coachesByTeam: CoachesByTeam;

	constructor(data: any) {
		this.coachesByTeam = this.parseCoachingStaffData(data);
	}

	private parseCoachingStaffData(data: any): CoachesByTeam {
		const coachesByTeam: CoachesByTeam = {};

		for (const team of Object.keys(data)) {
			coachesByTeam[team] = {};
			for (const c of data[team]) {
				coachesByTeam[team][c.id] = new Coach(c);
			}
		}

		return coachesByTeam;
	}

	public getCoach(coachId: string, team: TeamLevel): Coach | undefined {
		return this.coachesByTeam[team]?.[coachId];
	}

	public findCoachById(coachId: string): Coach | undefined {
		for (const team of Object.values(this.coachesByTeam)) {
			if (team[coachId]) return team[coachId];
		}
		return undefined;
	}

	public getTeamCoaches(team: TeamLevel): Coaches {
		return this.coachesByTeam[team] ?? {};
	}

	public getAllCoachesByTeam(): CoachesByTeam {
		return this.coachesByTeam;
	}

	public getHeadCoach(team: TeamLevel): Coach | undefined {
		const teamCoaches = this.coachesByTeam[team];
		if (!teamCoaches) return undefined;
		return Object.values(teamCoaches).find((c) => c.getIsHead());
	}

	public getStaffMatchSkillOvr(skillId: string, team: TeamLevel): number {
		const teamCoaches = this.coachesByTeam[team];
		if (!teamCoaches) return 0;

		const ratings: number[] = [];

		for (const coach of Object.values(teamCoaches)) {
			const stats = coach.getStats();
			const rating = stats[skillId]?.rating ?? 0;

			if (coach.getIsHead()) {
				ratings.push(rating, rating);
			} else {
				ratings.push(rating);
			}
		}

		return this.calculateOVR(ratings);
	}

	private calculateOVR(ratings: number[]): number {
		if (ratings.length === 0) return 0;
		const sum = ratings.reduce((acc, r) => acc + r, 0);
		const avg = sum / ratings.length;
		const excess = ratings.reduce(
			(acc, r) => (r > avg ? acc + r - avg : acc),
			0,
		);
		const correctedSum = sum + excess;
		const correctedAverage = correctedSum / ratings.length;
		return Math.round(correctedAverage * 10);
	}

	public getAllStaffMatchSkillOvrs(team: TeamLevel): Record<string, number> {
		const ovrs: Record<string, number> = {};

		for (const id of MATCH_SKILL_IDS) {
			ovrs[id] = this.getStaffMatchSkillOvr(id, team);
		}

		return ovrs;
	}
}

class CoachStaffVisualizer {
	private container: HTMLElement | null = null;
	private table: HTMLTableElement | null = null;
	private headerRows: HTMLTableRowElement[] = [];
	private dataRows: CoachDataRow = {};
	private mutationObserver: MutationObserver | null = null;
	private headerObserver: MutationObserver | null = null;
	private modalObserver: MutationObserver | null = null;
	private columnToggleButton: HTMLButtonElement | null = null;
	private columnToggleButtonListener: (() => void) | null = null;
	private coachingStaff: CoachingStaff | null = null;
	private showMinMax = false;
	private columnState: ColumnGroupState = {
		overallRating: false,
		trainingOvr: false,
		matchOvr: false,
	};
	private readonly columnGroupOrder: (keyof ColumnGroupState)[] = [
		"overallRating",
		"matchOvr",
		"trainingOvr",
	];

	public mount(container: HTMLElement) {
		this.detach();
		this.container = container;
		if (!this.container) return;

		this.showMinMax = this.loadMinMaxState();
		this.refreshTable();
		this.observeChanges();
	}

	public detach() {
		this.removeInjectedColumns();
		this.detachColumnToggleListener();
		this.disconnectObservers();

		this.container = null;
		this.table = null;
		this.headerRows = [];
		this.dataRows = {};
	}

	public updateCoachingStaff(staff: CoachingStaff) {
		this.coachingStaff = staff;
		if (this.container) {
			this.refreshTable();
		}
	}

	public refreshDisplay(): void {
		this.renderColumns();
	}

	private refreshTable(): void {
		this.initializeTableReferences();
		this.attachHeaderObserver();
		this.syncColumnStateFromTable();
		this.attachColumnToggleListener();
		this.renderColumns();
	}

	private observeChanges(): void {
		if (!this.container) return;

		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
		}

		this.mutationObserver = new MutationObserver((mutations) => {
			if (!this.container?.isConnected) {
				this.detach();
				return;
			}

			const hasTableChanges = mutations.some((mutation) =>
				[...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)].some(
					(node) => this.isRelevantTableMutation(node),
				),
			);

			if (hasTableChanges) {
				this.refreshTable();
			}
		});

		this.mutationObserver.observe(this.container, {
			childList: true,
			subtree: true,
		});
	}

	private initializeTableReferences() {
		if (!this.container) return;

		this.table = this.getCoachTable();
		this.headerRows = Array.from(
			this.table?.querySelectorAll<HTMLTableRowElement>("thead tr") ?? [],
		);
		this.dataRows = {};
		if (!this.table) return;

		const rows = this.table.querySelectorAll(`tbody tr`);
		rows.forEach((row) => {
			const tableRow = row as HTMLTableRowElement;
			const coachLink = tableRow.querySelector(`a.coach-link`);
			const href = coachLink?.getAttribute("href");
			if (href) {
				const coachId = href.split("/").pop() || "";
				if (coachId) {
					this.dataRows[coachId] = tableRow;
				}
			}
		});
	}

	private renderColumns() {
		this.removeInjectedColumns();

		if (!this.coachingStaff || !this.showMinMax) return;
		if (!isViewSettingEnabled("coachingStaff")) return;

		for (const group of this.columnGroupOrder) {
			if (this.columnState[group]) {
				this.renderColumnGroup(group);
			}
		}
	}

	private renderColumnGroup(group: keyof ColumnGroupState): void {
		if (!this.coachingStaff) return;

		const columns = this.getColumnsForGroup(group);
		const parentHeaderText = this.getParentHeaderText(group);
		const parentIndex = this.getFirstParentIndex(parentHeaderText);
		if (parentIndex === -1) return;

		this.headerRows.forEach((headerRow) => {
			const parentHeader = this.findNativeHeader(headerRow, parentHeaderText);
			if (!parentHeader) return;

			let insertAfter = parentHeader;
			columns.forEach((col) => {
				const th = document.createElement("th");
				th.className = parentHeader.className || "text-center px-2";
				th.dataset.column = `hn-${col.id}`;
				th.textContent = col.label;
				insertAfter.after(th);
				insertAfter = th;
			});
		});

		Object.entries(this.dataRows).forEach(([coachId, row]) => {
			const coach = this.coachingStaff?.findCoachById(coachId);
			const parentCell = row.children[parentIndex];
			if (!parentCell) return;

			let insertAfterCell = parentCell;
			columns.forEach((col) => {
				const td = document.createElement("td");
				td.className =
					(parentCell as HTMLElement).className || "text-center px-2";
				td.dataset.column = `hn-${col.id}`;
				if (coach) {
					td.appendChild(this.createRatingSpan(col.getValue(coach)));
				} else {
					td.textContent = "-";
				}
				insertAfterCell.after(td);
				insertAfterCell = td;
			});
		});
	}

	private getCoachTable(): HTMLTableElement | null {
		if (!this.container) return null;

		const coachLink = this.container.querySelector<HTMLAnchorElement>(
			`table tbody a.coach-link[href^="/coach/"]`,
		);
		return (coachLink?.closest("table") as HTMLTableElement | null) ?? null;
	}

	private getParentHeaderText(group: keyof ColumnGroupState): string {
		return {
			overallRating: "OVR",
			matchOvr: "MATCH",
			trainingOvr: "DRL",
		}[group];
	}

	private getColumnsForGroup(
		group: keyof ColumnGroupState,
	): CoachColumnDefinition[] {
		switch (group) {
			case "overallRating":
				return [
					{
						id: "ovr-min",
						label: "Min",
						getValue: (c: Coach) => c.getMinOvr(),
					},
					{
						id: "ovr-max",
						label: "Max",
						getValue: (c: Coach) => c.getMaxOvr(),
					},
				];
			case "trainingOvr":
				return [
					{
						id: "train-min",
						label: "D.Min",
						getValue: (c: Coach) => c.getMinTrainingOvr(),
					},
					{
						id: "train-max",
						label: "D.Max",
						getValue: (c: Coach) => c.getMaxTrainingOvr(),
					},
				];
			case "matchOvr":
				return [
					{
						id: "match-min",
						label: "M.Min",
						getValue: (c: Coach) => c.getMinMatchOvr(),
					},
					{
						id: "match-max",
						label: "M.Max",
						getValue: (c: Coach) => c.getMaxMatchOvr(),
					},
				];
		}
	}

	private getFirstParentIndex(parentHeaderText: string): number {
		for (const headerRow of this.headerRows) {
			const parentHeader = this.findNativeHeader(headerRow, parentHeaderText);
			if (parentHeader) {
				return Array.from(headerRow.children).indexOf(parentHeader);
			}
		}
		return -1;
	}

	private findNativeHeader(
		headerRow: HTMLTableRowElement,
		text: string,
	): HTMLTableCellElement | null {
		return (
			Array.from(headerRow.querySelectorAll<HTMLTableCellElement>("th")).find(
				(th) =>
					!th.dataset.column?.startsWith("hn-") &&
					th.textContent?.trim() === text,
			) ?? null
		);
	}

	private removeInjectedColumns(): void {
		const scope = this.table ?? this.container;
		scope
			?.querySelectorAll(`[data-column^="hn-"]`)
			.forEach((node) => node.remove());
	}

	private syncColumnStateFromTable(): void {
		const nativeHeaderTexts = this.headerRows.flatMap((headerRow) =>
			Array.from(
				headerRow.querySelectorAll<HTMLTableCellElement>(
					'th:not([data-column^="hn-"])',
				),
			).map((th) => th.textContent?.trim() ?? ""),
		);

		this.columnState.overallRating = nativeHeaderTexts.includes("OVR");
		this.columnState.matchOvr = nativeHeaderTexts.includes("MATCH");
		this.columnState.trainingOvr = nativeHeaderTexts.includes("DRL");
	}

	private attachHeaderObserver(): void {
		if (this.headerObserver) {
			this.headerObserver.disconnect();
			this.headerObserver = null;
		}

		if (!this.headerRows.length) return;

		this.headerObserver = new MutationObserver((mutations) => {
			const shouldUpdate = mutations.some((mutation) =>
				[...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)].some(
					(node) => this.isNativeHeaderMutation(node),
				),
			);

			if (shouldUpdate) {
				this.refreshTable();
			}
		});

		this.headerRows.forEach((headerRow) => {
			this.headerObserver?.observe(headerRow, { childList: true });
		});
	}

	private isNativeHeaderMutation(node: Node): boolean {
		return (
			node instanceof HTMLTableCellElement &&
			node.tagName === "TH" &&
			!node.dataset.column?.startsWith("hn-")
		);
	}

	private isRelevantTableMutation(node: Node): boolean {
		if (!(node instanceof HTMLElement)) return false;
		if (node.dataset.column?.startsWith("hn-")) return false;

		const relevantTags = new Set(["TABLE", "THEAD", "TBODY", "TR", "TH", "TD"]);
		if (relevantTags.has(node.tagName)) return true;

		return !!node.querySelector("table, thead, tbody, tr, a.coach-link");
	}

	private getColumnToggleButton(): HTMLButtonElement | null {
		if (!this.container) return null;
		const buttons =
			this.container.querySelectorAll<HTMLButtonElement>("button");
		return (
			Array.from(buttons).find((btn) =>
				btn.querySelector("svg.fa-table-cells"),
			) ?? null
		);
	}

	private attachColumnToggleListener(): void {
		this.detachColumnToggleListener();

		const toggleButton = this.getColumnToggleButton();
		if (!toggleButton) return;

		this.columnToggleButton = toggleButton;
		this.columnToggleButtonListener = () => {
			this.watchForModal();
		};

		toggleButton.addEventListener("click", this.columnToggleButtonListener);
	}

	private detachColumnToggleListener(): void {
		if (this.columnToggleButton && this.columnToggleButtonListener) {
			this.columnToggleButton.removeEventListener(
				"click",
				this.columnToggleButtonListener,
			);
		}
		this.columnToggleButton = null;
		this.columnToggleButtonListener = null;
	}

	private watchForModal(): void {
		if (this.modalObserver) {
			this.modalObserver.disconnect();
		}

		this.modalObserver = new MutationObserver(() => {
			const modal = document.querySelector(".card-modal");
			if (modal) {
				this.modalObserver?.disconnect();
				this.modalObserver = null;
				this.injectModalCheckboxes(modal as HTMLElement);
			}
		});

		this.modalObserver.observe(document.body, {
			childList: true,
			subtree: true,
		});

		const existingModal = document.querySelector(".card-modal");
		if (existingModal) {
			this.modalObserver.disconnect();
			this.modalObserver = null;
			this.injectModalCheckboxes(existingModal as HTMLElement);
			return;
		}

		window.setTimeout(() => {
			this.modalObserver?.disconnect();
			this.modalObserver = null;
		}, 2000);
	}

	private createCheckboxElement(
		id: string,
		label: string,
		checked: boolean,
	): DocumentFragment {
		const fragment = document.createDocumentFragment();

		const input = document.createElement("input");
		input.id = id;
		input.type = "checkbox";
		input.checked = checked;
		input.className = "mr-2 hidden";

		const labelEl = document.createElement("label");
		labelEl.htmlFor = id;
		labelEl.className =
			"flex flex-row items-center font-semibold text-gray-800 cursor-pointer select-none hover:text-orange-500";

		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute(
			"class",
			`svg-inline--fa ${checked ? "fa-square-check" : "fa-square"} mr-2`,
		);
		svg.setAttribute("aria-hidden", "true");
		svg.setAttribute("focusable", "false");
		svg.setAttribute("data-prefix", checked ? "fas" : "far");
		svg.setAttribute("data-icon", checked ? "square-check" : "square");
		svg.setAttribute("role", "img");
		svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
		svg.setAttribute("viewBox", "0 0 448 512");

		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("fill", "currentColor");
		path.setAttribute("d", this.getCheckboxPath(checked));

		svg.appendChild(path);
		labelEl.appendChild(svg);

		const span = document.createElement("span");
		span.textContent = label;
		labelEl.appendChild(span);

		fragment.appendChild(input);
		fragment.appendChild(labelEl);

		return fragment;
	}

	private updateCheckboxVisual(input: HTMLInputElement): void {
		const modal = input.closest(".card-modal") ?? document;
		const label = modal.querySelector(`label[for="${input.id}"]`);
		const svg = label?.querySelector("svg");
		if (!svg) return;

		const checked = input.checked;
		svg.setAttribute(
			"class",
			`svg-inline--fa ${checked ? "fa-square-check" : "fa-square"} mr-2`,
		);
		svg.setAttribute("data-prefix", checked ? "fas" : "far");
		svg.setAttribute("data-icon", checked ? "square-check" : "square");

		const path = svg.querySelector("path");
		path?.setAttribute("d", this.getCheckboxPath(checked));
	}

	private getCheckboxPath(checked: boolean): string {
		return checked
			? "M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zM337 209L209 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L303 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"
			: "M384 80c8.8 0 16 7.2 16 16l0 320c0 8.8-7.2 16-16 16L64 432c-8.8 0-16-7.2-16-16L48 96c0-8.8 7.2-16 16-16l320 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32z";
	}

	private injectModalCheckboxes(modal: HTMLElement): void {
		const checkboxId = "hn-coaching-staff-min-max";
		if (modal.querySelector(`#${checkboxId}`)) return;

		const ovrLabel = modal.querySelector('label[for="OVR"]');
		if (!ovrLabel) return;

		const minMaxElement = this.createCheckboxElement(
			checkboxId,
			"Min/Max",
			this.showMinMax,
		);

		ovrLabel.after(minMaxElement);

		const minMaxInput = modal.querySelector<HTMLInputElement>(
			`#${checkboxId}`,
		);

		modal
			.querySelector(`label[for="${checkboxId}"]`)
			?.addEventListener("click", (e) => {
				e.preventDefault();
				if (minMaxInput) {
					minMaxInput.checked = !minMaxInput.checked;
					this.updateCheckboxVisual(minMaxInput);
				}
			});

		const updateButton = Array.from(modal.querySelectorAll("button")).find(
			(btn) => btn.textContent?.trim().toLowerCase() === "update",
		);

		updateButton?.addEventListener("click", () => {
			if (!minMaxInput) return;
			this.showMinMax = minMaxInput.checked;
			this.saveMinMaxState();
			window.setTimeout(() => this.refreshTable(), 0);
		});

		const allCheckbox = modal.querySelector<HTMLInputElement>("#all");
		const allLabel = modal.querySelector('label[for="all"]');

		if (allCheckbox && allLabel) {
			allLabel.addEventListener("click", () => {
				window.setTimeout(() => {
					if (!minMaxInput) return;
					minMaxInput.checked = allCheckbox.checked;
					this.updateCheckboxVisual(minMaxInput);
				}, 0);
			});
		}
	}

	private loadMinMaxState(): boolean {
		return localStorage.getItem(COACHING_STAFF_MIN_MAX_STORAGE_KEY) === "true";
	}

	private saveMinMaxState(): void {
		localStorage.setItem(
			COACHING_STAFF_MIN_MAX_STORAGE_KEY,
			String(this.showMinMax),
		);
	}

	private disconnectObservers(): void {
		if (this.mutationObserver) {
			this.mutationObserver.disconnect();
			this.mutationObserver = null;
		}
		if (this.headerObserver) {
			this.headerObserver.disconnect();
			this.headerObserver = null;
		}
		if (this.modalObserver) {
			this.modalObserver.disconnect();
			this.modalObserver = null;
		}
	}

	private createRatingSpan(ovr: number): HTMLSpanElement {
		const span = document.createElement("span");
		span.className = "badge";
		span.style.userSelect = "none";
		span.textContent = ovr.toString();

		if (window.userData && typeof window.userData.getColorPair === "function") {
			try {
				const [bgColor, color] = window.userData.getColorPair(ovr);
				span.style.backgroundColor = bgColor;
				span.style.color = color;
			} catch (e) {
				console.error("Error getting color pair for OVR:", ovr, e);
			}
		}

		return span;
	}
}

class CoachingStaffFeatureInstance
	implements MountedFeature<CoachingStaffResources>
{
	private readonly visualizer = new CoachStaffVisualizer();
	private readonly unsubscribeViewSettings: () => void;
	private coachingStaff: CoachingStaff;

	constructor(context: FeatureContext<CoachingStaffResources>) {
		this.coachingStaff = context.resources.coachingStaff;
		this.visualizer.updateCoachingStaff(this.coachingStaff);
		this.visualizer.mount(context.root);
		this.unsubscribeViewSettings = onViewSettingsChanged(() => {
			this.visualizer.refreshDisplay();
		});
	}

	public update(context: FeatureContext<CoachingStaffResources>): void {
		if (context.resources.coachingStaff === this.coachingStaff) return;

		this.coachingStaff = context.resources.coachingStaff;
		this.visualizer.updateCoachingStaff(this.coachingStaff);
	}

	public dispose(): void {
		this.unsubscribeViewSettings();
		this.visualizer.detach();
	}
}

function getCoachingStaffResources(
	resources: ResourceStore,
): CoachingStaffResources | null {
	const coachingStaff = resources.get<CoachingStaff>(COACHING_STAFF_RESOURCE);
	return coachingStaff ? { coachingStaff } : null;
}

function findCoachingStaffRoot(match: HTMLElement): HTMLElement | null {
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

function isCoachingStaffRootReady(root: HTMLElement): boolean {
	if (!isCoachingStaffTabActive(root)) return false;

	const hasCoachRows = !!root.querySelector(
		`table tbody a.coach-link[href^="/coach/"]`,
	);
	const hasTableOptionsButton = Array.from(
		root.querySelectorAll<HTMLButtonElement>("button"),
	).some((button) => button.querySelector("svg.fa-table-cells"));

	return hasCoachRows && hasTableOptionsButton;
}

function isCoachingStaffTabActive(root: HTMLElement): boolean {
	const activeButton =
		root.querySelector<HTMLButtonElement>(".btn-toggle.active");
	const text = activeButton?.textContent?.replace(/\s+/g, " ").trim() ?? "";
	return text.includes("Coaching Staff") || text === "Coaches";
}

export function handleCoachingStaffData(data: any) {
	const staff = data.staff;
	if (!staff) return;

	extensionRuntime.setResource(
		COACHING_STAFF_RESOURCE,
		new CoachingStaff(staff),
	);
}
