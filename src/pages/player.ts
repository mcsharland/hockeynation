import { SKILL_NAME_TO_ID } from "../mappings/skill-mappings";

type StatStrength = "strongest" | "weakest" | null;

interface Stat {
    rating: number;
    max: boolean;
    strength: StatStrength;
}

interface Stats {
    [id: string]: Stat;
}

interface PlayerStats {
    stats: Stats;
    scout: ScoutLevel;
}

type ScoutLevel = 0 | 1 | 2;

export class Player {
    private stats: Stats;
    private minStats: Stats;
    private maxStats: Stats;
    private scoutLevel: ScoutLevel;
    private isAmateur: boolean;
    private ovr: number;
    private minOvr: number;
    private maxOvr: number;

    constructor(data: any) {
        const player = this.parsePlayerData(data);
        this.stats = player.stats;
        this.scoutLevel = player.scout;
        this.isAmateur = data?.amateur ?? false;
        this.minStats = this.calcMinStats(this.stats);
        this.maxStats = this.calcMaxStats(this.stats);
        this.ovr = data?.rating ?? 0;
        this.minOvr = this.calculateOVR(this.minStats);
        this.maxOvr = this.calculateOVR(this.maxStats);
    }

    private getFloor(): number {
        return this.isAmateur ? 3 : 4;
    }

    private getCap(): number {
        return this.isAmateur ? 5 : 10;
    }

    private parsePlayerData(data: any): PlayerStats {
        const player = {} as PlayerStats;
        player.stats = {};

        const allHidden = data.skills.every(
            (skill: any) => skill?.hidden ?? false,
        );
        const someHidden = data.skills.some(
            (skill: any) => skill?.hidden ?? false,
        );
        player.scout = allHidden ? 1 : someHidden ? 2 : 0;

        for (const s of data.skills) {
            player.stats[s.id] = {
                rating: parseInt(s?.lvl ?? 0),
                max: s?.max ?? false,
                strength: null, // default, change below
            };
        }
        if (data?.talents?.weakest) {
            // if weakness exists so does strength
            player.stats[data.talents.weakest].strength = "weakest";
            data.talents.strongest.forEach(
                (str: string) =>
                    (player.stats[str as keyof typeof player.stats].strength =
                        "strongest"),
            );
        }
        return player;
    }

    private calcMinStats(stats: Stats): Stats {
        const minStats = structuredClone(stats);
        let weakestRating = this.getCap();
        let highestNonStrongestRating = 0;

        // update ratings and find the highest non-strongest rating
        for (const stat of Object.values(minStats)) {
            stat.rating = stat.max
                ? stat.rating
                : Math.min(stat.rating + 1, this.getCap());
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

        // adjust weakest stats
        for (const stat of Object.values(minStats)) {
            if (stat.rating < weakestRating) {
                stat.rating = weakestRating;
            }
            if (stat.rating < this.getFloor()) {
                stat.rating = this.getFloor();
            }
        }
        return minStats;
    }

    private calcMaxStats(stats: Stats): Stats {
        const maxStats: Stats = structuredClone(stats);
        let strongestRating = this.getCap();
        let lowestNonWeakestRating = this.getCap();

        // find the strongest rating
        for (const stat of Object.values(maxStats)) {
            if (stat.strength === "strongest") {
                strongestRating = Math.min(
                    strongestRating,
                    stat.max ? stat.rating : this.getCap(),
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
                stat.rating < this.getCap()
            ) {
                stat.rating = this.getCap();
            }
        }

        // adjust weakest stats
        for (const stat of Object.values(maxStats)) {
            if (
                stat.strength === "weakest" &&
                stat.rating > lowestNonWeakestRating
            ) {
                stat.rating = lowestNonWeakestRating;
            }
            if (stat.rating < this.getFloor()) {
                stat.rating = this.getFloor();
            }
        }

        return maxStats;
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

    public getScoutLevel(): ScoutLevel {
        return this.scoutLevel;
    }

    public getOvr(): number {
        return this.ovr;
    }
    public getMaxOvr(): number {
        return Math.max(this.maxOvr, this.ovr); // handles cases where ovr is known through scouting, but stats are unknown
    }

    public getMinOvr(): number {
        return Math.max(this.minOvr, this.ovr);
    }

    private calculateOVR(stats: Stats): number {
        if (this.scoutLevel === 1) return 0;
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
}

class PlayerStatsVisualizer {
    private playerStats: Player | null = null;
    private parent: HTMLElement | null = null;
    private ovrElement: HTMLElement | null = null;
    private statsTable: HTMLTableElement | null = null;
    private statsRows: NodeListOf<HTMLTableRowElement> | null = null;
    private skillsHeaderDiv: HTMLDivElement | null = null;
    private dropdownElement: HTMLSelectElement | null = null;
    private dropdownListener: ((event: Event) => void) | null = null; // store listeners
    private disabled: boolean = false;

    constructor() {}

    public attach(el: HTMLElement) {
        this.detach(); // clean up previous state first

        if (!this.playerStats) return;

        this.parent = el;

        if (!this.initializeDOMReferences()) {
            this.detach(); // clean up if initialization failed
            return;
        }

        this.attachUIAndListeners();
        this.updateHockeyPucks("Default");
    }

    public detach() {
        if (!this.parent) return;

        if (this.dropdownElement && this.dropdownListener) {
            this.dropdownElement.removeEventListener(
                "change",
                this.dropdownListener,
            );
        }
        if (this.dropdownElement && this.dropdownElement.parentNode) {
            this.dropdownElement.parentNode.removeChild(this.dropdownElement);
        }

        this.parent = null;
        this.ovrElement = null;
        this.statsTable = null;
        this.statsRows = null;
        this.skillsHeaderDiv = null;
        this.dropdownElement = null;
        this.dropdownListener = null;
    }

    private initializeDOMReferences(): boolean {
        if (!this.parent) return false;

        this.ovrElement =
            this.parent.querySelector<HTMLElement>(".polygon text");

        const puck =
            this.parent.querySelector<SVGSVGElement>("svg.fa-hockey-puck");

        this.statsTable = puck
            ? (puck.closest(`tbody`) as HTMLTableElement | null)
            : null;
        if (this.statsTable) {
            this.statsRows =
                this.statsTable.querySelectorAll<HTMLTableRowElement>("tr");
            if (!this.statsRows || this.statsRows.length === 0) {
                return false; // critical
            }
        }

        const headers = Array.from(
            this.parent.querySelectorAll(".card-header"),
        );
        this.skillsHeaderDiv = headers.find(
            (d) => d?.textContent?.trim() === "Skills",
        ) as HTMLDivElement | null;

        return !!(this.ovrElement && this.statsTable);
    }

    public updatePlayer(player: Player | null) {
        this.playerStats = player;
    }

    private attachUIAndListeners(): void {
        if (!this.skillsHeaderDiv) return;
        if (this.skillsHeaderDiv.querySelector(".stats-dropdown-player"))
            return; // safety

        this.dropdownElement = document.createElement("select");

        this.dropdownElement.classList.add("stats-dropdown-player");

        this.dropdownElement.style.marginLeft = "auto";
        this.dropdownElement.style.fontSize = "12px";
        this.dropdownElement.style.padding = "2px";
        this.dropdownElement.style.border = "none";
        this.dropdownElement.style.backgroundColor = "#fff";
        this.dropdownElement.style.color = "#000";
        this.dropdownElement.style.width = "85px";
        this.dropdownElement.style.height = "18px";
        this.dropdownElement.style.lineHeight = "18px";
        this.dropdownElement.style.paddingTop = "0px";
        this.dropdownElement.style.paddingBottom = "0px";
        this.dropdownElement.style.paddingRight = "21px";
        this.dropdownElement.style.borderRadius = "2px";

        // store the listener function
        this.dropdownListener = (event) => {
            const selectElement = event.target as HTMLSelectElement;
            const selectedOption = selectElement.value;
            this.updateHockeyPucks(selectedOption);
        };
        this.dropdownElement.addEventListener("change", this.dropdownListener);

        const options = ["Default", "Min", "Max"];
        options.forEach((option) => {
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.textContent = option;
            optionElement.style.textAlign = "center";
            this.dropdownElement!.appendChild(optionElement);
        });

        this.skillsHeaderDiv.appendChild(this.dropdownElement);
    }

    private updateHockeyPucks(option: string): void {
        if (!this.statsRows || !this.playerStats) return;

        const statsToUse =
            option === "Min"
                ? this.playerStats.getMinStats()
                : option === "Max"
                  ? this.playerStats.getMaxStats()
                  : this.playerStats.getStats();

        if (!statsToUse) return;

        this.statsRows.forEach((row) => {
            const skillNameText = row.cells[0]?.textContent?.trim();
            if (!skillNameText) return;

            const statName = SKILL_NAME_TO_ID[skillNameText];
            if (!statName) return;

            const pucksCell = row.cells[1];
            const ratingCell = row.cells[2];
            if (!pucksCell || !ratingCell) return;

            const pucks =
                pucksCell.querySelectorAll<SVGElement>("svg.fa-hockey-puck");
            const ratingSpan = ratingCell.querySelector("span");

            // need base stats for comparison
            const baseStats = this.playerStats!.getStats(); // playerStats is checked above
            const baseStat = baseStats ? baseStats[statName] : null;
            const displayStat = statsToUse[statName];

            if (baseStat && displayStat && pucks.length > 0) {
                pucks.forEach((puck, index) => {
                    puck.classList.remove("text-blue-400");
                    if (index < displayStat.rating) {
                        puck.classList.remove("text-gray-300");
                        if (index >= baseStat.rating) {
                            puck.classList.add("text-blue-400");
                        }
                    } else {
                        puck.classList.add("text-gray-300");
                    }

                    if (index === displayStat.rating - 1 && baseStat.max) {
                        puck.classList.add("max-level");
                    } else {
                        puck.classList.remove("max-level");
                    }
                });

                if (ratingSpan) {
                    ratingSpan.textContent = `(${displayStat.rating})`;
                }
            }
        });

        if (!this.playerStats) return;

        const ovr =
            option === "Min"
                ? this.playerStats.getMinOvr()
                : option === "Max"
                  ? this.playerStats.getMaxOvr()
                  : this.playerStats.getOvr();

        const isDefaultScoutWithOvr =
            option === "Default" &&
            this.playerStats.getScoutLevel() === 1 &&
            this.playerStats.getOvr() > 0;

        const ovrToShow = isDefaultScoutWithOvr
            ? this.playerStats.getOvr()
            : ovr;

        this.updateOVR(ovrToShow);
    }
    private updateOVR(ovr: number): void {
        if (!this.ovrElement) return;

        this.ovrElement.textContent = ovr > 0 ? ovr.toString() : "?"; // Show ? if OVR is 0, though in practice this should never happen

        const polygonElement =
            this.ovrElement.parentElement?.querySelector("polygon");
        if (polygonElement && ovr > 0) {
            // only color if OVR > 0
            if (
                window.userData &&
                typeof window.userData.getColorPair === "function"
            ) {
                try {
                    const [bgColor, color] = window.userData.getColorPair(ovr);
                    polygonElement.setAttribute("fill", bgColor);
                    this.ovrElement.setAttribute("fill", color);
                } catch (e) {
                    console.error("Failed to get color pair for OVR:", ovr, e);
                }
            }
        }
    }
}

const playerVisualizerInstance = new PlayerStatsVisualizer();

export function handlePlayerData(data: any) {
    const player = new Player(data);
    playerVisualizerInstance.updatePlayer(player);
}

export function manipulatePlayerPage(el: HTMLElement) {
    playerVisualizerInstance.attach(el);
}
