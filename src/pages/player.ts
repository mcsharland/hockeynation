import { SKILL_NAME_TO_ID } from "../mappings/skill-mappings";

declare global {
  interface Window {
    playerData?: Player | null;
  }
}

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
  scout: boolean;
}

export class Player {
  private stats: Stats;
  private minStats: Stats;
  private maxStats: Stats;
  private isScout: boolean;
  private ovr: number;
  private minOvr: number;
  private maxOvr: number;

  constructor(data: any) {
    const player = this.parsePlayerData(data);
    this.stats = player.stats;
    this.isScout = player.scout;
    this.minStats = this.calcMinStats(this.stats);
    this.maxStats = this.calcMaxStats(this.stats);
    this.ovr = data?.rating ?? 0;
    this.minOvr = this.calculateOVR(this.minStats);
    this.maxOvr = this.calculateOVR(this.maxStats);
  }

  private parsePlayerData(data: any): PlayerStats {
    const player = {} as PlayerStats;
    player.stats = {};

    player.scout = data.skills.every((skill: any) => skill?.hidden ?? false);

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
    let weakestRating = 10;
    let highestNonStrongestRating = 0;

    // update ratings and find the highest non-strongest rating
    for (const stat of Object.values(minStats)) {
      stat.rating = stat.max ? stat.rating : stat.rating + 1;
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
      if (stat.rating < 4) {
        stat.rating = 4;
      }
    }
    return minStats;
  }

  private calcMaxStats(stats: Stats): Stats {
    const maxStats: Stats = structuredClone(stats);
    let strongestRating = 10;
    let lowestNonWeakestRating = 10;

    // find the strongest rating
    for (const stat of Object.values(maxStats)) {
      if (stat.strength === "strongest") {
        strongestRating = Math.min(
          strongestRating,
          stat.max ? stat.rating : 10,
        );
      }
    }

    // update ratings and find the lowest non-weakest rating
    for (const stat of Object.values(maxStats)) {
      if (!stat.max && stat.rating < strongestRating) {
        stat.rating = strongestRating;
      }
      if (stat.strength !== "weakest") {
        lowestNonWeakestRating = Math.min(lowestNonWeakestRating, stat.rating);
      }
    }

    // adjust strongest stats
    for (const stat of Object.values(maxStats)) {
      if (stat.strength === "strongest" && !stat.max && stat.rating < 10) {
        stat.rating = 10;
      }
    }

    // adjust weakest stats
    for (const stat of Object.values(maxStats)) {
      if (stat.strength === "weakest" && stat.rating > lowestNonWeakestRating) {
        stat.rating = lowestNonWeakestRating;
      }
      if (stat.rating < 4) {
        stat.rating = 4;
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

  public getIsScout(): boolean {
    return this.isScout;
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
    if (this.isScout) return 0;
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
  private playerStats: Player;
  private parentNode: HTMLElement;
  private ovrElement: HTMLElement | null = null;
  private statsTable: HTMLTableElement | null = null;
  private statsRows: NodeListOf<HTMLTableRowElement> | null = null;

  constructor(playerStats: Player, parentNode: HTMLElement) {
    this.playerStats = playerStats;
    this.parentNode = parentNode;
    this.initialize();
  }

  private initialize(): void {
    const puck =
      this.parentNode.querySelector<SVGSVGElement>("svg.fa-hockey-puck");
    if (!puck) {
      return;
    }

    this.statsTable = puck.closest(`tbody`) as HTMLTableElement | null;
    if (!this.statsTable) {
      return;
    }

    // get stats rows
    this.statsRows =
      this.statsTable.querySelectorAll<HTMLTableRowElement>("tr");
    if (!this.statsRows.length) {
      return;
    }

    // get OVR element
    this.ovrElement =
      this.parentNode.querySelector<HTMLElement>(".polygon text");

    // add dropdown to skills header
    this.addDropdown();

    // initialize display
    this.updateHockeyPucks("Default");
  }

  // Consider not adding / disabling when all of a player's stats are maxed
  private addDropdown(): void {
    const div = Array.from(document.querySelectorAll(".card-header")).filter(
      (d) => d?.textContent?.trim() === "Skills",
    )?.[0] as HTMLDivElement;

    if (div === undefined) return;
    if (div.querySelector(".stats-dropdown")) return;

    const dropdown = document.createElement("select");
    dropdown.classList.add("stats-dropdown");
    dropdown.style.marginLeft = "auto";
    dropdown.style.fontSize = "12px";
    dropdown.style.padding = "2px";
    dropdown.style.border = "none";
    dropdown.style.backgroundColor = "#fff";
    dropdown.style.color = "#000";
    dropdown.style.width = "85px";
    dropdown.style.height = "18px";
    dropdown.style.lineHeight = "18px";
    dropdown.style.paddingTop = "0px";
    dropdown.style.paddingBottom = "0px";
    dropdown.style.paddingRight = "21px";
    dropdown.style.borderRadius = "2px";

    dropdown.addEventListener("change", (event) => {
      const selectElement = event.target as HTMLSelectElement;
      const selectedOption = selectElement.value;
      this.updateHockeyPucks(selectedOption);
    });

    const options = ["Default", "Min", "Max"];
    options.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.textContent = option;
      optionElement.style.textAlign = "center";
      dropdown.appendChild(optionElement);
    });

    div.appendChild(dropdown);
  }

  private updateHockeyPucks(option: string): void {
    if (!this.statsRows) return;

    const statsToUse =
      option === "Min"
        ? this.playerStats.getMinStats()
        : option === "Max"
          ? this.playerStats.getMaxStats()
          : this.playerStats.getStats();

    this.statsRows.forEach((row) => {
      const statName =
        SKILL_NAME_TO_ID[row.cells[0]?.textContent?.trim() || ""];
      const pucksCell = row.cells[1];
      const pucks =
        pucksCell.querySelectorAll<SVGElement>("svg.fa-hockey-puck");
      const ratingCell = row.cells[2];
      const ratingSpan = ratingCell?.querySelector("span");
      const baseStat = this.playerStats.getStats()[statName];
      const displayStat = statsToUse[statName];

      if (baseStat && displayStat) {
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

        // update the rating value in the span element
        if (ratingSpan) {
          ratingSpan.textContent = `(${displayStat.rating})`;
        }
      }
    });

    // update OVR
    const ovr =
      option === "Min"
        ? this.playerStats.getMinOvr()
        : option === "Max"
          ? this.playerStats.getMaxOvr()
          : this.playerStats.getOvr();

    if (option !== "Default" || !this.playerStats.getIsScout()) {
      this.updateOVR(ovr);
    } else if (this.playerStats.getOvr() !== 0) {
      this.updateOVR(this.playerStats.getOvr());
    }
  }

  private updateOVR(ovr: number): void {
    if (!this.ovrElement) return;

    this.ovrElement.textContent = ovr.toString();

    const polygonElement =
      this.ovrElement.parentElement?.querySelector("polygon");
    if (polygonElement) {
      if (window.userData) {
        polygonElement.setAttribute(
          "fill",
          window.userData.getColorPair(ovr)[0],
        );
        this.ovrElement.setAttribute(
          "fill",
          window.userData.getColorPair(ovr)[1],
        );
      }
    }
  }
}

export function handlePlayerData(data: any) {
  window.playerData = new Player(data);
  const event = new CustomEvent("playerDataReady");
  window.dispatchEvent(event);
}

export function manipulatePlayerPage(el: HTMLElement) {
  if (window.playerData) {
    new PlayerStatsVisualizer(window.playerData, el);
  } else {
    const handler = () => {
      new PlayerStatsVisualizer(window.playerData!, el);
      window.removeEventListener("playerDataReady", handler);
    };
    window.addEventListener("playerDataReady", handler);
  }
}
