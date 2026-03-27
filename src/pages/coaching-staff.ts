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

const MATCH_SKILL_IDS = ["OFP", "DFP", "BAT", "PP", "PK"];

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
    private dataRows: CoachDataRow = {};
    private mutationObserver: MutationObserver | null = null;
    private coachingStaff: CoachingStaff | null = null;

    public attach(el: HTMLElement) {
        this.detach();
        this.container = el.parentElement;
        if (!this.container) return;

        this.initializeTableReferences();
        this.renderColumns();
        this.observeChanges();
    }

    public detach() {
        if (!this.container) return;
        this.container
            .querySelectorAll(`[data-column^="hn-"]`)
            .forEach((node) => node.remove());

        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }

        this.container = null;
        this.dataRows = {};
    }

    public updateCoachingStaff(staff: CoachingStaff) {
        this.coachingStaff = staff;
    }
    private observeChanges(): void {
        if (!this.container) return;

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
                            !(node as HTMLElement).dataset?.column?.startsWith(
                                "hn-",
                            ) &&
                            ((node as HTMLElement).tagName === "TR" ||
                                (node as HTMLElement).tagName === "TABLE" ||
                                (node as HTMLElement).querySelector?.("tr") ||
                                (node as HTMLElement).querySelector?.("table")),
                    ),
            );

            if (hasTableChanges) {
                this.initializeTableReferences();
                this.renderColumns();
            }
        });

        this.mutationObserver.observe(this.container, {
            childList: true,
            subtree: true,
        });
    }

    private initializeTableReferences() {
        if (!this.container) return;

        this.dataRows = {};

        const rows = this.container.querySelectorAll(`table tbody tr`);
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
        if (!this.container) return;

        this.container
            .querySelectorAll(`[data-column^="hn-"]`)
            .forEach((node) => node.remove());

        if (!this.coachingStaff) return;

        const beforeOvr = [
            {
                id: "train-ovr",
                label: "DRL",
                getValue: (c: Coach) => c.getTrainingOvr(),
            },
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
            {
                id: "match-ovr",
                label: "MATCH",
                getValue: (c: Coach) => c.getMatchOvr(),
            },
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

        const afterOvr = [
            {
                id: "min-ovr",
                label: "Min",
                getValue: (c: Coach) => c.getMinOvr(),
            },
            {
                id: "max-ovr",
                label: "Max",
                getValue: (c: Coach) => c.getMaxOvr(),
            },
        ];

        // find OVR column index from first header
        const allHeaders = this.container.querySelectorAll(`thead tr`);
        if (!allHeaders.length) return;

        const firstOvrTh = Array.from(
            allHeaders[0].querySelectorAll("th"),
        ).find((th) => th.textContent?.trim() === "OVR");
        if (!firstOvrTh) return;

        const parentIndex = Array.from(allHeaders[0].children).indexOf(
            firstOvrTh,
        );

        // inject headers into every thead row
        allHeaders.forEach((headerRow) => {
            const ovrTh = headerRow.children[parentIndex];
            if (!ovrTh) return;

            // inject before OVR
            [...beforeOvr].forEach((col) => {
                const th = document.createElement("th");
                th.className = "py-2 px-4 w-1 select-none";
                th.dataset.column = `hn-${col.id}`;
                th.textContent = col.label;
                ovrTh.before(th);
            });

            // inject after OVR
            let insertAfter = ovrTh;
            afterOvr.forEach((col) => {
                const th = document.createElement("th");
                th.className = "py-2 px-4 w-1 select-none";
                th.dataset.column = `hn-${col.id}`;
                th.textContent = col.label;
                insertAfter.after(th);
                insertAfter = th;
            });
        });

        // insert data cells in each row
        Object.entries(this.dataRows).forEach(([coachId, row]) => {
            const coach = this.coachingStaff!.findCoachById(coachId);
            const parentCell = row.children[parentIndex];
            if (!parentCell) return;

            // inject before OVR cell
            [...beforeOvr].forEach((col) => {
                const td = document.createElement("td");
                td.className = "px-2 py-1 whitespace-nowrap text-center";
                td.dataset.column = `hn-${col.id}`;
                if (coach) {
                    td.appendChild(this.createRatingSpan(col.getValue(coach)));
                } else {
                    td.textContent = "-";
                }
                parentCell.before(td);
            });

            // inject after OVR cell
            let insertAfterCell = parentCell;
            afterOvr.forEach((col) => {
                const td = document.createElement("td");
                td.className = "px-2 py-1 whitespace-nowrap text-center";
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

    private getPaginationContainer(): HTMLElement | null {
        if (!this.container) return null;
        return this.container.querySelector(`div:has(> ul) ul`);
    }
}

const coachingStaffVisualizerInstance = new CoachStaffVisualizer();

export function handleCoachingStaffData(data: any) {
    const staff = data.staff;
    if (!staff) return;

    coachingStaffVisualizerInstance.updateCoachingStaff(
        new CoachingStaff(staff),
    );
}

export function manipulateCoachingStaffPage(el: HTMLElement) {
    coachingStaffVisualizerInstance.attach(el);
}
