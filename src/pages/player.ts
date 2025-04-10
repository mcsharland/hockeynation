import { SKILL_NAME_TO_ID } from "../mappings/skill-mappings";

declare global {
  interface Window {
    statsTableObserver?: MutationObserver | null;
    playerStatsData?: PlayerStats | null;
  }
}

type StatStrength = "strongest" | "weakest" | null;

interface Stat {
  rating: number;
  max: boolean;
  strength: StatStrength;
}

type Stats = Record<string, Stat>;

interface Player {
  stats: Stats;
  scout: boolean;
}

class PlayerStats {
  public stats: Stats;
  public minStats: Stats;
  public maxStats: Stats;
  public isScout: boolean;

  constructor(data: any) {
    const player = this.parsePlayerData(data);
    this.stats = player.stats;
    this.isScout = player.scout;
    this.minStats = this.calcMinStats(this.stats);
    this.maxStats = this.calcMaxStats(this.stats);
  }

  private parsePlayerData(data: any): Player {
    const player = {} as Player;
    player.stats = {};

    player.scout = data.data.skills.some(
      (skill: any) => skill?.hidden ?? false,
    );

    for (const s of data.data.skills) {
      player.stats[s.id] = {
        rating: parseInt(s?.lvl ?? 0),
        max: s?.max ?? false,
        strength: null, // default, change below
      };
    }
    if (data.data?.talents?.weakest) {
      // if weakness exists so does strength
      player.stats[data.data.talents.weakest].strength = "weakest";
      data.data.talents.strongest.forEach(
        (str: String) =>
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

  public calculateOVR(stats: Stats): number {
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

class StatsVisualizer {
  private playerStats: PlayerStats;
  private parentNode: HTMLElement;
  private ovrElement: HTMLElement | null = null;
  private baseOVR: string | null = null;
  private statsTable: HTMLTableElement | null = null;
  private statsRows: NodeListOf<HTMLTableRowElement> | null = null;

  constructor(playerStats: PlayerStats, parentNode: HTMLElement) {
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

    let ancestor: HTMLElement | null = puck.parentElement;
    while (ancestor && !ancestor.matches("table[data-v-a81c915e]")) {
      ancestor = ancestor.parentElement;
    }

    this.statsTable = ancestor as HTMLTableElement | null;
    if (!this.statsTable) {
      return;
    }

    // get stats rows
    this.statsRows =
      this.statsTable.querySelectorAll<HTMLTableRowElement>("tbody tr");
    if (!this.statsRows.length) {
      return;
    }

    // get OVR element
    this.ovrElement = this.parentNode.querySelector<HTMLElement>(
      "div.polygon.select-none text",
    );
    this.baseOVR = this.ovrElement ? this.ovrElement.textContent : null;

    // add dropdown to skills header
    this.addDropdown();

    // initialize display
    this.updateHockeyPucks("Default");
  }

  // Consider not adding / disabling twhen all of a player's stats are maxed
  private addDropdown(): void {
    const div = Array.from(document.querySelectorAll("div.card-header")).filter(
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

  private updateHockeyPucks(option: String): void {
    if (!this.statsRows) return;

    const statsToUse =
      option === "Min"
        ? this.playerStats.minStats
        : option === "Max"
          ? this.playerStats.maxStats
          : this.playerStats.stats;

    this.statsRows.forEach((row) => {
      const statName =
        SKILL_NAME_TO_ID[row.cells[0]?.textContent?.trim() || ""];
      const pucksCell = row.cells[1];
      const pucks =
        pucksCell.querySelectorAll<SVGElement>("svg.fa-hockey-puck");
      const ratingCell = row.cells[2];
      const ratingSpan = ratingCell?.querySelector("span");
      const baseStat = this.playerStats.stats[statName];
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
    let ovr = this.playerStats.calculateOVR(statsToUse);

    if (option !== "Default" || !this.playerStats.isScout) {
      this.updateOVR(ovr);
    } else if (this.baseOVR !== null) {
      this.updateOVR(parseInt(this.baseOVR));
    }
  }

  private updateOVR(ovr: number): void {
    if (!this.ovrElement) return;

    this.ovrElement.textContent = ovr.toString();

    const polygonElement =
      this.ovrElement.parentElement?.querySelector("polygon");
    if (polygonElement) {
      let fillColor = "";
      if (ovr <= 39) {
        fillColor = "#f56565";
      } else if (ovr >= 40 && ovr <= 54) {
        fillColor = "#ed8936";
      } else if (ovr >= 55 && ovr <= 69) {
        fillColor = "#1995AD";
      } else if (ovr >= 70 && ovr <= 79) {
        fillColor = "#10b981";
      } else if (ovr >= 80) {
        fillColor = "#383839";
      }
      polygonElement.setAttribute("fill", fillColor);
    }
  }
}

function observerCallback(mutations: MutationRecord[]): void {
  if (!window.playerStatsData) return;

  for (const mutation of mutations) {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          if (element.querySelector("table[data-v-a81c915e]")) {
            new StatsVisualizer(window.playerStatsData, element);
          }
        }
      }
    }
  }
}

function initializeObserver(): void {
  if (!window.statsTableObserver) {
    window.statsTableObserver = new MutationObserver(observerCallback);

    window.statsTableObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

export function handlePlayerData(data: any) {
  // I just naturally assumed that the player request would only be used on the player page...
  // This is probably true but this will be left in until I confirm or refactor the handler
  if (!window.location.href.startsWith("https://hockey-nation.com/player"))
    return;

  window.playerStatsData = new PlayerStats(data);
  initializeObserver();
}
