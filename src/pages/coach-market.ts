import { SKILL_NAME_TO_ID } from "../mappings/skill-mappings";

type CoachType = "regular" | "interim" | "amateur";

type TeamLevel = "PRO" | "FRM" | "U21" | "U17";

type StatStrength = "strongest" | "weakest" | null;

interface Stat {
    rating: number;
    max: boolean;
    strength: StatStrength;
}

interface Stats {
    [id: string]: Stat;
}

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

const MATCH_SKILL_IDS = ["OFP", "DFP", "BAT", "PP", "PK"];

export class Coach {
    private stats: Stats;
    private minStats: Stats;
    private maxStats: Stats;
    private coachType: CoachType;
    private isHead: boolean;
    private ovr: number;
    private minOvr: number;
    private maxOvr: number;

    constructor(data: any) {
        // amateur might need to be handled differently later on
        this.coachType = data.interim
            ? "interim"
            : data.amateur
              ? "amateur"
              : "regular";
        this.isHead = data.job?.head ?? false;
        this.stats = this.parseCoachData(data);
        this.minStats = this.calcMinStats(this.stats);
        this.maxStats = this.calcMaxStats(this.stats);
        this.ovr = data?.rating ?? 0;
        this.minOvr = this.calculateOVR(this.minStats);
        this.maxOvr = this.calculateOVR(this.maxStats);
    }

    private getFloor(): number {
        return this.coachType === "regular" ? 4 : 3;
    }

    private getCap(): number {
        return this.coachType === "regular" ? 10 : 5;
    }

    private parseCoachData(data: any): Stats {
        const stats: Stats = {};

        for (const s of data.skills) {
            stats[s.id] = {
                rating: parseInt(s?.lvl ?? 0),
                max: s?.max ?? false,
                strength: null,
            };
        }

        if (data?.talents?.weakest) {
            const weakestId = SKILL_NAME_TO_ID[data.talents.weakest];
            if (weakestId && stats[weakestId]) {
                stats[weakestId].strength = "weakest";
            }

            data.talents.strongest.forEach((str: string) => {
                const strongestId = SKILL_NAME_TO_ID[str];
                if (strongestId && stats[strongestId]) {
                    stats[strongestId].strength = "strongest";
                }
            });
        }

        return stats;
    }

    private calcMinStats(stats: Stats): Stats {
        const minStats = structuredClone(stats);
        const cap = this.getCap();
        const floor = this.getFloor();

        let weakestRating = cap;
        let highestNonStrongestRating = 0;

        // update ratings and find the highest non-strongest rating
        for (const stat of Object.values(minStats)) {
            stat.rating = stat.max
                ? stat.rating
                : Math.min(stat.rating + 1, cap);
            if (stat.strength !== "strongest") {
                highestNonStrongestRating = Math.max(
                    highestNonStrongestRating,
                    stat.rating,
                );
            }
        }

        // find the weakest rating
        for (const stat of Object.values(minStats)) {
            if (stat.strength === "weakest") {
                weakestRating = stat.rating;
            }
        }

        // adjust strongest stats
        for (const stat of Object.values(minStats)) {
            if (
                stat.strength === "strongest" &&
                stat.rating < highestNonStrongestRating
            ) {
                stat.rating = highestNonStrongestRating;
            }
        }

        // adjust weakest stats and apply floor
        for (const stat of Object.values(minStats)) {
            if (stat.rating < weakestRating) {
                stat.rating = weakestRating;
            }
            if (stat.rating < floor) {
                stat.rating = floor;
            }
        }

        return minStats;
    }

    private calcMaxStats(stats: Stats): Stats {
        const maxStats: Stats = structuredClone(stats);
        const cap = this.getCap();
        const floor = this.getFloor();

        let strongestRating = cap;
        let lowestNonWeakestRating = cap;

        // find the strongest rating
        for (const stat of Object.values(maxStats)) {
            if (stat.strength === "strongest") {
                strongestRating = Math.min(
                    strongestRating,
                    stat.max ? stat.rating : cap,
                );
            }
        }

        // update ratings and find the lowest non-weakest rating
        for (const stat of Object.values(maxStats)) {
            if (!stat.max && stat.rating < strongestRating) {
                stat.rating = strongestRating;
            }
            if (stat.strength !== "weakest") {
                lowestNonWeakestRating = Math.min(
                    lowestNonWeakestRating,
                    stat.rating,
                );
            }
        }

        // adjust strongest stats
        for (const stat of Object.values(maxStats)) {
            if (
                stat.strength === "strongest" &&
                !stat.max &&
                stat.rating < cap
            ) {
                stat.rating = cap;
            }
        }

        // adjust weakest stats and apply floor
        for (const stat of Object.values(maxStats)) {
            if (
                stat.strength === "weakest" &&
                stat.rating > lowestNonWeakestRating
            ) {
                stat.rating = lowestNonWeakestRating;
            }
            if (stat.rating < floor) {
                stat.rating = floor;
            }
        }

        return maxStats;
    }

    private calculateOVR(stats: Stats): number {
        const statsValues = Object.values(stats);
        const sum = statsValues.reduce(
            (acc: number, stat: Stat) => acc + stat.rating,
            0,
        );
        const avg = sum / statsValues.length;
        const excess = statsValues.reduce(
            (acc: number, stat: Stat) =>
                stat.rating > avg ? acc + stat.rating - avg : acc,
            0,
        );
        const correctedSum = sum + excess;
        const correctedAverage = correctedSum / statsValues.length;
        return Math.round(correctedAverage * 10);
    }

    public getStats(): Stats {
        return this.stats;
    }

    public getMinStats(): Stats {
        return this.minStats;
    }

    public getMaxStats(): Stats {
        return this.maxStats;
    }

    public getCoachType(): CoachType {
        return this.coachType;
    }

    public getIsHead(): boolean {
        return this.isHead;
    }

    public getOvr(): number {
        return this.ovr;
    }

    public getMinOvr(): number {
        return Math.max(this.minOvr, this.ovr);
    }

    public getMaxOvr(): number {
        return Math.max(this.maxOvr, this.ovr);
    }

    private filterMatchStats(stats: Stats): Stats {
        const matchStats: Stats = {};
        for (const id of MATCH_SKILL_IDS) {
            if (stats[id]) {
                matchStats[id] = stats[id];
            }
        }
        return matchStats;
    }

    public getMatchStats(): Stats {
        return this.filterMatchStats(this.stats);
    }

    public getMinMatchStats(): Stats {
        return this.filterMatchStats(this.minStats);
    }

    public getMaxMatchStats(): Stats {
        return this.filterMatchStats(this.maxStats);
    }

    public getMatchOvr(): number {
        return this.calculateOVR(this.getMatchStats());
    }

    public getMinMatchOvr(): number {
        return Math.max(
            this.calculateOVR(this.getMinMatchStats()),
            this.getMatchOvr(),
        );
    }

    public getMaxMatchOvr(): number {
        return Math.max(
            this.calculateOVR(this.getMaxMatchStats()),
            this.getMatchOvr(),
        );
    }

    private filterTrainingStats(stats: Stats): Stats {
        const trainingStats: Stats = {};
        for (const [id, stat] of Object.entries(stats)) {
            if (!MATCH_SKILL_IDS.includes(id)) {
                trainingStats[id] = stat;
            }
        }
        return trainingStats;
    }

    public getTrainingStats(): Stats {
        return this.filterTrainingStats(this.stats);
    }

    public getMinTrainingStats(): Stats {
        return this.filterTrainingStats(this.minStats);
    }

    public getMaxTrainingStats(): Stats {
        return this.filterTrainingStats(this.maxStats);
    }

    public getTrainingOvr(): number {
        return this.calculateOVR(this.getTrainingStats());
    }

    public getMinTrainingOvr(): number {
        return Math.max(
            this.calculateOVR(this.getMinTrainingStats()),
            this.getTrainingOvr(),
        );
    }

    public getMaxTrainingOvr(): number {
        return Math.max(
            this.calculateOVR(this.getMaxTrainingStats()),
            this.getTrainingOvr(),
        );
    }
}

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

class CoachMarketVisualizer {
    private container: HTMLElement | null = null;
    private coachingStaff: CoachingStaff | null = null;
    private marketCoaches: Map<string, Coach> = new Map();

    private header: HTMLTableRowElement | null = null;
    private dataRows: CoachDataRow = {};
    private tbody: HTMLTableSectionElement | null = null;

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

    private searchButtonListener: (() => void) | null = null;
    private paginationListeners: Map<HTMLElement, () => void> = new Map();
    private mutationObserver: MutationObserver | null = null;
    private observerTimeoutId: number | null = null;
    private columnToggleButtonListener: (() => void) | null = null;
    private modalObserver: MutationObserver | null = null;
    private headerObserver: MutationObserver | null = null;
    private showMinMax: boolean = false;

    public updateCoachingStaff(staff: CoachingStaff) {
        this.coachingStaff = staff;
    }

    public updateMarketCoaches(data: any[]) {
        this.marketCoaches.clear();

        for (const c of data) {
            const coach = new Coach(c);
            this.marketCoaches.set(c.id, coach);
        }
    }

    public attach(el: HTMLElement) {
        this.detach();
        this.container = el.parentElement;
        if (!this.container) return;

        // this.columnState = this.loadColumnState();
        this.showMinMax = this.loadMinMaxState();
        this.initializeTableReferences();
        this.attachHeaderObserver();
        this.syncColumnStateFromTable();
        this.attachSearchListener();
        this.attachPaginationListeners();
        this.attachColumnToggleListener();
        this.renderColumns();
    }

    public detach() {
        if (!this.container) return;

        // remove injected columns
        this.container
            .querySelectorAll(`[data-column^="hn-"]`)
            .forEach((node) => node.remove());

        this.detachSearchListener();
        this.detachPaginationListeners();
        this.detachColumnToggleListener();

        if (this.headerObserver) {
            this.headerObserver.disconnect();
            this.headerObserver = null;
        }

        if (this.modalObserver) {
            this.modalObserver.disconnect();
            this.modalObserver = null;
        }

        this.disconnectObserver();

        this.container = null;
        this.header = null;
        this.dataRows = {};
        this.tbody = null;
    }

    // public setColumnState(group: keyof ColumnGroupState, visible: boolean) {
    //     this.columnState[group] = visible;
    //     // this.saveColumnState();
    //     if (this.container) {
    //         this.renderColumns();
    //     }
    // }

    public getColumnState(): ColumnGroupState {
        return { ...this.columnState };
    }

    private getTableContainer(): HTMLElement | null {
        if (!this.container) return null;
        return this.container.querySelector(`div:has(> table)`);
    }

    private getPaginationContainer(): HTMLElement | null {
        if (!this.container) return null;
        return this.container.querySelector(`div:has(> ul) ul`);
    }

    private getSearchButton(): HTMLButtonElement | null {
        if (!this.container) return null;
        const buttons =
            this.container.querySelectorAll<HTMLButtonElement>("button");
        return (
            Array.from(buttons).find(
                (btn) => btn.textContent?.trim().toLowerCase() === "search",
            ) ?? null
        );
    }

    private initializeTableReferences() {
        if (!this.container) return;

        const tableContainer = this.getTableContainer();

        this.header = tableContainer?.querySelector(`table thead tr`) ?? null;
        this.tbody = tableContainer?.querySelector(`table tbody`) ?? null;

        this.dataRows = {};
        if (!this.tbody) return;

        const rows = this.tbody.querySelectorAll(`tr`);
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

    private attachSearchListener(): void {
        const searchButton = this.getSearchButton();
        if (!searchButton) return;

        this.searchButtonListener = () => {
            this.onTableUpdateTrigger();
        };

        searchButton.addEventListener("click", this.searchButtonListener);
    }

    private detachSearchListener(): void {
        if (!this.searchButtonListener) return;

        const searchButton = this.getSearchButton();
        if (searchButton) {
            searchButton.removeEventListener(
                "click",
                this.searchButtonListener,
            );
        }
        this.searchButtonListener = null;
    }

    private attachPaginationListeners(): void {
        if (!this.container) return;

        this.detachPaginationListeners();

        const paginationContainer = this.getPaginationContainer();
        const pageLinks =
            paginationContainer?.querySelectorAll<HTMLAnchorElement>(
                `li a:not(.disabled)`,
            ) ?? [];

        pageLinks.forEach((el) => {
            const listener = () => {
                this.onTableUpdateTrigger();
            };
            el.addEventListener("click", listener);
            this.paginationListeners.set(el, listener);
        });
    }

    private detachPaginationListeners(): void {
        this.paginationListeners.forEach((listener, el) => {
            el.removeEventListener("click", listener);
        });
        this.paginationListeners.clear();
    }

    private onTableUpdateTrigger(): void {
        if (this.observerTimeoutId) {
            clearTimeout(this.observerTimeoutId);
            this.observerTimeoutId = null;
        }

        if (!this.mutationObserver && this.container) {
            this.mutationObserver = new MutationObserver((mutations) => {
                if (!this.container?.isConnected) {
                    this.detach();
                    return;
                }
                const hasTableChanges = mutations.some(
                    (m) =>
                        m.addedNodes.length > 0 &&
                        Array.from(m.addedNodes).some(
                            (node) =>
                                node.nodeType === Node.ELEMENT_NODE &&
                                ((node as Element).tagName === "TR" ||
                                    (node as Element).tagName === "TABLE" ||
                                    (node as Element).querySelector("tr") ||
                                    (node as Element).querySelector("table")),
                        ),
                );

                if (hasTableChanges) {
                    this.onTableUpdated();
                }
            });

            this.mutationObserver.observe(this.container, {
                childList: true,
                subtree: true,
            });
        }

        this.observerTimeoutId = window.setTimeout(() => {
            this.onTableUpdated();
        }, 3000);
    }

    private onTableUpdated(): void {
        this.initializeTableReferences();
        this.syncColumnStateFromTable();
        this.renderColumns();
        this.attachPaginationListeners();
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
        const toggleButton = this.getColumnToggleButton();
        if (!toggleButton) return;

        this.columnToggleButtonListener = () => {
            this.watchForModal();
        };

        toggleButton.addEventListener("click", this.columnToggleButtonListener);
    }

    private detachColumnToggleListener(): void {
        if (!this.columnToggleButtonListener) return;

        const toggleButton = this.getColumnToggleButton();
        if (toggleButton) {
            toggleButton.removeEventListener(
                "click",
                this.columnToggleButtonListener,
            );
        }
        this.columnToggleButtonListener = null;
    }

    private watchForModal(): void {
        if (this.modalObserver) {
            this.modalObserver.disconnect();
        }

        this.modalObserver = new MutationObserver((mutations) => {
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

        // fall back - stop watching after 2s
        setTimeout(() => {
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

        const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg",
        );
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

        const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
        );
        path.setAttribute("fill", "currentColor");
        path.setAttribute(
            "d",
            checked
                ? "M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zM337 209L209 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L303 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"
                : "M384 80c8.8 0 16 7.2 16 16l0 320c0 8.8-7.2 16-16 16L64 432c-8.8 0-16-7.2-16-16L48 96c0-8.8 7.2-16 16-16l320 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32z",
        );

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
        const label = document.querySelector(`label[for="${input.id}"]`);
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
        if (path) {
            path.setAttribute(
                "d",
                checked
                    ? "M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zM337 209L209 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L303 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"
                    : "M384 80c8.8 0 16 7.2 16 16l0 320c0 8.8-7.2 16-16 16L64 432c-8.8 0-16-7.2-16-16L48 96c0-8.8 7.2-16 16-16l320 0zM64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32z",
            );
        }
    }

    private injectModalCheckboxes(modal: HTMLElement): void {
        const ovrLabel = modal.querySelector('label[for="OVR"]');
        if (!ovrLabel) return;

        // create  Min/Max checkbox
        const minMaxElement = this.createCheckboxElement(
            "hn-min-max",
            "Min/Max",
            this.showMinMax,
        );

        ovrLabel.after(minMaxElement);

        const minMaxInput =
            modal.querySelector<HTMLInputElement>("#hn-min-max");

        modal
            .querySelector('label[for="hn-min-max"]')
            ?.addEventListener("click", (e) => {
                e.preventDefault();
                if (minMaxInput) {
                    minMaxInput.checked = !minMaxInput.checked;
                    this.updateCheckboxVisual(minMaxInput);
                }
            });

        // hook into update button
        const updateButton = Array.from(modal.querySelectorAll("button")).find(
            (btn) => btn.textContent?.trim().toLowerCase() === "update",
        );

        if (updateButton) {
            updateButton.addEventListener("click", () => {
                if (minMaxInput) {
                    this.showMinMax = minMaxInput.checked;
                    this.saveMinMaxState();
                    this.renderColumns();
                }
            });
        }

        const allCheckbox = modal.querySelector<HTMLInputElement>("#all");
        const allLabel = modal.querySelector('label[for="all"]');

        if (allCheckbox && allLabel) {
            allLabel.addEventListener("click", () => {
                setTimeout(() => {
                    const newState = allCheckbox.checked;
                    if (minMaxInput) {
                        minMaxInput.checked = newState;
                        this.updateCheckboxVisual(minMaxInput);
                    }
                }, 0);
            });
        }
    }

    private disconnectObserver(): void {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
        if (this.observerTimeoutId) {
            clearTimeout(this.observerTimeoutId);
            this.observerTimeoutId = null;
        }
    }

    private renderColumns() {
        if (!this.container || !this.header) return;

        // remove previously injected columns
        this.container
            .querySelectorAll(`[data-column^="hn-"]`)
            .forEach((node) => node.remove());

        if (!this.showMinMax) return;

        // render groups in consistent order, appending to end
        for (const group of this.columnGroupOrder) {
            if (this.columnState[group]) {
                this.renderColumnGroup(group);
            }
        }
    }

    private renderColumnGroup(group: keyof ColumnGroupState) {
        if (!this.header) return;

        const columns = this.getColumnsForGroup(group);

        // find parent col to insert after
        const parentHeaderText = {
            overallRating: "OVR",
            matchOvr: "MATCH",
            trainingOvr: "DRL",
        }[group];

        const parentHeader = Array.from(
            this.header.querySelectorAll("th"),
        ).find((th) => th.textContent?.trim() === parentHeaderText);

        if (!parentHeader) return;

        const parentIndex = Array.from(this.header.children).indexOf(
            parentHeader,
        );

        // add headers after parent, (in reverse order)
        let insertAfter = parentHeader;
        columns.forEach((col) => {
            const th = document.createElement("th");
            th.className = "py-2 px-4 w-1 sort-column";
            th.dataset.column = `hn-${col.id}`;
            th.textContent = col.label;
            insertAfter.after(th);
            insertAfter = th;
        });

        // append data cells after parent in each row
        Object.entries(this.dataRows).forEach(([coachId, row]) => {
            const coach = this.marketCoaches.get(coachId);

            const parentCell = row.children[parentIndex];
            if (!parentCell) return;

            let insertAfterCell = parentCell;
            columns.forEach((col) => {
                const td = document.createElement("td");
                td.className = "px-2 py-1 whitespace-nowrap text-center";
                td.dataset.column = `hn-${col.id}`;

                if (coach) {
                    const value = col.getValue(coach);
                    td.appendChild(this.createRatingSpan(value));
                } else {
                    td.textContent = "-";
                }

                insertAfterCell.after(td);
                insertAfterCell = td;
            });
        });
    }

    private getColumnsForGroup(group: keyof ColumnGroupState) {
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

    private createRatingSpan(ovr: number): HTMLSpanElement {
        const span = document.createElement("span");
        span.className = "badge";
        span.style.userSelect = "none";
        span.textContent = ovr.toString();

        if (
            window.userData &&
            typeof window.userData.getColorPair === "function"
        ) {
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

    private loadMinMaxState(): boolean {
        return localStorage.getItem("hn-coach-market-minmax") === "true";
    }

    private saveMinMaxState(): void {
        localStorage.setItem("hn-coach-market-minmax", String(this.showMinMax));
    }

    private syncColumnStateFromTable(): void {
        if (!this.header) return;

        // check if columns exist in header
        const hasOvr =
            this.header.querySelector('th:not([data-column^="hn-"])') !==
                null &&
            Array.from(this.header.querySelectorAll("th")).some(
                (th) => th.textContent?.trim() === "OVR",
            );
        const hasMat = Array.from(this.header.querySelectorAll("th")).some(
            (th) => th.textContent?.trim() === "MATCH",
        );
        const hasDrl = Array.from(this.header.querySelectorAll("th")).some(
            (th) => th.textContent?.trim() === "DRL",
        );

        this.columnState.overallRating = hasOvr;
        this.columnState.matchOvr = hasMat;
        this.columnState.trainingOvr = hasDrl;
    }

    private attachHeaderObserver(): void {
        if (!this.header) return;

        this.headerObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "childList") {
                    const shouldUpdate =
                        Array.from(mutation.addedNodes).some(
                            (node) =>
                                node instanceof HTMLTableCellElement &&
                                node.tagName === "TH" &&
                                ["OVR", "MATCH", "DRL"].includes(
                                    node.textContent?.trim() ?? "",
                                ),
                        ) ||
                        Array.from(mutation.removedNodes).some(
                            (node) =>
                                node instanceof HTMLTableCellElement &&
                                node.tagName === "TH" &&
                                ["OVR", "MATCH", "DRL"].includes(
                                    node.textContent?.trim() ?? "",
                                ),
                        );

                    if (shouldUpdate) {
                        this.syncColumnStateFromTable();
                        this.renderColumns();
                    }
                }
            });
        });

        this.headerObserver.observe(this.header, {
            childList: true,
        });
    }
}

const coachMarketVisualizerInstance = new CoachMarketVisualizer();

export function handleCoachingStaffData(data: any) {
    const staff = data.staff;
    if (!staff) return;

    coachMarketVisualizerInstance.updateCoachingStaff(new CoachingStaff(staff));
}

export function handleCoachMarketData(data: any[]) {
    coachMarketVisualizerInstance.updateMarketCoaches(data);
}

export function manipulateCoachMarket(el: HTMLElement) {
    coachMarketVisualizerInstance.attach(el);
}
