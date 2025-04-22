import { Player } from "./player";

declare global {
  interface Window {
    rosterData?: Roster | null;
  }
}

interface Players {
  [id: string]: Player;
}

interface DataRow {
  [id: string]: HTMLTableRowElement;
}

type OvrType = "Default" | "Min" | "Max";

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

class RosterStatsVisualizer {
  private roster: Roster | null = null;
  private parent: HTMLElement | null = null;
  private header: HTMLTableRowElement | null = null;
  private footer: HTMLTableRowElement | null = null;
  private dataRows: DataRow | null = null;
  private tbody: HTMLTableSectionElement | null = null;
  private onGeneralPage: boolean = true;
  private minHeaderCell: HTMLTableCellElement | null = null;
  private maxHeaderCell: HTMLTableCellElement | null = null;
  private sortColumn: "min-ovr" | "max-ovr" | null = null;
  private sortAscending: boolean = true;

  // store bound listeners for easier removal
  private generalButtonClickListener: (() => void) | null = null;
  private skillsButtonClickListener: (() => void) | null = null;
  private selectChangeListener: (() => void) | null = null;
  private headerClickListeners: Map<HTMLElement, () => void> = new Map();

  constructor() {}

  public attach(el: HTMLElement) {
    this.detach();

    this.parent = el;

    if (this.parent && this.roster) {
      this.initializeVisualizerState();
      this.initializeTableReferences();
      this.attachEventListeners();
      this.renderColumns();
      // if (this.sortColumn) this.sortRows();
    } else {
      // cleanup if attachment is incomplete
      this.detach();
    }
  }

  public detach() {
    if (!this.parent) return;

    const tabButtons =
      this.parent.querySelectorAll<HTMLButtonElement>(`.btn-toggle`);
    if (tabButtons.length >= 2) {
      const isGeneral = tabButtons[0]?.textContent?.trim() === "General";
      const generalButton = isGeneral ? tabButtons[0] : tabButtons[1];
      const skillsButton = isGeneral ? tabButtons[1] : tabButtons[0];
      if (this.generalButtonClickListener && generalButton)
        generalButton.removeEventListener(
          "click",
          this.generalButtonClickListener,
        );
      if (this.skillsButtonClickListener && skillsButton)
        skillsButton.removeEventListener(
          "click",
          this.skillsButtonClickListener,
        );
    }

    const selectElement = this.parent.querySelector(`select[value]`);
    if (this.selectChangeListener && selectElement)
      selectElement.removeEventListener("input", this.selectChangeListener);

    this.headerClickListeners.forEach((listener, th) => {
      th.removeEventListener("click", listener);
    });
    this.headerClickListeners.clear();

    this.parent
      .querySelectorAll(`[data-column]`)
      .forEach((node) => node.remove());

    this.parent = null;
    this.header = null;
    this.footer = null;
    this.dataRows = null;
    this.tbody = null;
    this.minHeaderCell = null;
    this.maxHeaderCell = null;

    this.generalButtonClickListener = null;
    this.skillsButtonClickListener = null;
    this.selectChangeListener = null;
  }

  public updateRoster(newRoster: Roster | null) {
    this.roster = newRoster;
    if (this.parent && this.roster) {
      this.initializeTableReferences();
      this.renderColumns();
      // if (this.sortColumn) this.sortRows();
    }
  }

  private initializeVisualizerState() {
    if (!this.parent) return;
    const tabButtons =
      this.parent.querySelectorAll<HTMLButtonElement>(`.btn-toggle`);
    if (!tabButtons.length || tabButtons.length < 2) {
      this.onGeneralPage = true;
      return;
    }

    const isGeneral = tabButtons[0]?.textContent?.trim() === "General";
    const generalButton = isGeneral ? tabButtons[0] : tabButtons[1];

    this.onGeneralPage = generalButton?.classList.contains("active") ?? true;
  }

  private initializeTableReferences() {
    if (!this.parent) return;

    this.header = this.parent.querySelector(`table thead tr`);
    this.footer = this.parent.querySelector(`table tfoot tr`);
    this.tbody = this.parent.querySelector("table tbody");

    this.dataRows = {} as DataRow; // reset row references
    if (!this.tbody) return;

    const rows = this.tbody.querySelectorAll(`tr`);
    rows.forEach((row) => {
      const tableRow = row as HTMLTableRowElement;
      const playerLink = tableRow.querySelector("a.player-link");
      const href = playerLink?.getAttribute("href");
      if (href) {
        const playerId = href.split("/").pop() || "";
        if (playerId) {
          this.dataRows![playerId] = tableRow;
        }
      }
    });
  }

  private attachEventListeners() {
    if (!this.parent) return;

    const tabButtons =
      this.parent.querySelectorAll<HTMLButtonElement>(`.btn-toggle`);
    if (tabButtons.length === 2) {
      const isGeneral = tabButtons[0]?.textContent?.trim() === "General";
      const generalButton = isGeneral ? tabButtons[0] : tabButtons[1];
      const skillsButton = isGeneral ? tabButtons[1] : tabButtons[0];

      // store the bound function to remove it later
      this.generalButtonClickListener = () => {
        if (this.onGeneralPage) return;
        this.onGeneralPage = true;

        // re-initialize references and render columns for the new state
        this.initializeTableReferences();
        this.renderColumns();
        // if (this.sortColumn) this.sortRows();
      };

      if (generalButton)
        generalButton.addEventListener(
          "click",
          this.generalButtonClickListener,
        );

      this.skillsButtonClickListener = () => {
        if (!this.onGeneralPage) return;
        this.onGeneralPage = false;
        this.initializeTableReferences();
        this.renderColumns(); // remove columns as we are not on general page
        // if (this.sortColumn) this.sortRows();
      };
      if (skillsButton)
        skillsButton.addEventListener("click", this.skillsButtonClickListener);
    }

    const selectElement = this.parent.querySelector(`select[value]`);
    if (selectElement) {
      this.selectChangeListener = () => {
        this.initializeTableReferences();
        this.renderColumns();
        // if (this.sortColumn) this.sortRows();
      };
      selectElement.addEventListener("input", this.selectChangeListener);
    }

    // clear any stale listeners first (though detach should handle this)
    this.headerClickListeners.forEach((listener, th) =>
      th.removeEventListener("click", listener),
    );
    this.headerClickListeners.clear();

    // add listeners to existing TH elements (not the dynamic min/max ones yet)
    this.header?.querySelectorAll(`th`).forEach((th) => {
      // safety check
      if (!th.hasAttribute("data-column")) {
        const listener = () => {
          this.sortColumn = null;
          this.sortAscending = false;
          // Potentially update header styles (remove arrows) if sort indicators are used
          // Potentially re-sort rows to default if needed
        };
        th.addEventListener("click", listener);
        this.headerClickListeners.set(th, listener); // stored for removal
      }
    });

    // NOTE: Listeners for dynamically added Min/Max header cells
    // should be added within `renderColumns` after the cells are created.
  }

  private renderColumns(): void {
    if (
      !this.parent ||
      !this.roster ||
      !this.dataRows ||
      !this.header ||
      !this.footer
    ) {
      return;
    }

    // remove previously added dynamic columns and their header/footer cells
    this.parent
      .querySelectorAll(`[data-column]`)
      .forEach((node) => node.remove());
    // TODO: Remove sorting listeners specifically attached to old min/max headers if sorting is added
    this.minHeaderCell = null; // reset references
    this.maxHeaderCell = null;

    // add columns ONLY if on the General Page ---
    if (!this.onGeneralPage) return;

    Object.entries(this.dataRows).forEach(([playerId, row]) => {
      const player = this.roster!.getPlayer(playerId);
      if (!player) return;

      const minDataCell = document.createElement("td");
      minDataCell.className = "md:px-4 px-2 py-2 text-center";
      minDataCell.dataset.column = "min-ovr";
      minDataCell.appendChild(
        this.createRatingSpan(player.getMinOvr(), player.getIsScout()),
      );

      const maxDataCell = document.createElement("td");
      maxDataCell.className = "md:px-4 px-2 py-2 text-center";
      maxDataCell.dataset.column = "max-ovr";
      maxDataCell.appendChild(
        this.createRatingSpan(player.getMaxOvr(), player.getIsScout()),
      );

      // append to the end of the row
      row.appendChild(minDataCell);
      row.appendChild(maxDataCell);
    });

    //header
    this.minHeaderCell = document.createElement("th");
    this.minHeaderCell.className = "md:px-4 px-2 py-2 text-center sort-column";
    this.minHeaderCell.innerText = " Min ";
    this.minHeaderCell.dataset.column = "min-ovr";
    // TODO: Add click listener here for sorting if implemented
    // this.minHeaderCell.addEventListener('click', this.handleMinSortClick);
    this.header.appendChild(this.minHeaderCell);

    this.maxHeaderCell = document.createElement("th");
    this.maxHeaderCell.className = "md:px-4 px-2 py-2 text-center sort-column";
    this.maxHeaderCell.innerText = " Max ";
    this.maxHeaderCell.dataset.column = "max-ovr";
    // TODO: Add click listener here for sorting if implemented
    // this.maxHeaderCell.addEventListener('click', this.handleMaxSortClick);
    this.header.appendChild(this.maxHeaderCell);

    // footer
    const minFooterCell = document.createElement("td");
    minFooterCell.className = "md:px-4 px-2 py-2 text-center";
    minFooterCell.dataset.column = "min-ovr";
    minFooterCell.appendChild(
      this.createRatingSpan(this.getRosterAvgOvr("Min"), false),
    );

    const maxFooterCell = document.createElement("td");
    maxFooterCell.className = "md:px-4 px-2 py-2 text-center";
    maxFooterCell.dataset.column = "max-ovr";
    maxFooterCell.appendChild(
      this.createRatingSpan(this.getRosterAvgOvr("Max"), false),
    );

    this.footer.appendChild(minFooterCell);
    this.footer.appendChild(maxFooterCell);
  }

  private getRosterAvgOvr(ovrType: OvrType): number {
    if (!this.roster) return 0;
    const playerOvr = {
      Default: (player: Player) => player.getOvr(),
      Min: (player: Player) => player.getMinOvr(),
      Max: (player: Player) => player.getMaxOvr(),
    };
    const players = this.roster.getAllPlayers();
    if (!players) return 0;

    const values = Object.values(players)
      .filter(
        (player) => player && (!player.getIsScout() || player.getOvr() > 0),
      ) // ensure player exists & filter scouts without OVR
      .map((player) => playerOvr[ovrType](player));

    return values.length
      ? Math.round(
          values.reduce(
            (sum, value, _, array) => sum + value / array.length,
            0,
          ),
        )
      : 0;
  }

  private createRatingSpan(ovr: number, scout: boolean): HTMLSpanElement {
    const ratingSpan: HTMLSpanElement = document.createElement("span");
    if (scout && (!ovr || ovr <= 0)) {
      // treat 0 OVR for scout same as unknown
      ratingSpan.classList.add("question-mark");
      ratingSpan.innerText = "?";
      ratingSpan.style.color = "#bcbabe";
      ratingSpan.style.textAlign = "center";
    } else {
      ratingSpan.classList.add("badge");
      ratingSpan.style.userSelect = "none";
      ratingSpan.innerText = ovr.toString();

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
  // private getRowPlayerName(row: HTMLTableRowElement): [string, string] {
  //   const fullName = row
  //     .querySelector(`a.player-link span`)
  //     ?.textContent?.trim();
  //   const [firstname = "", lastname = ""] = fullName?.split(" ") ?? [];
  //   return [firstname, lastname];
  // }

  // private addSorting(): void {
  //   if (!this.minHeaderCell || !this.maxHeaderCell) return;

  //   // min ovr sorting
  //   this.minHeaderCell.addEventListener("click", () => {
  //     if (this.sortColumn === "min-ovr") {
  //       // if already sorting by this column, toggle direction
  //       this.sortAscending = !this.sortAscending;
  //     } else {
  //       this.sortColumn = "min-ovr";
  //       this.sortAscending = false; // default descending
  //     }

  //     this.sortRows();
  //   });

  //   // max ovr sorting
  //   this.maxHeaderCell.addEventListener("click", () => {
  //     if (this.sortColumn === "max-ovr") {
  //       this.sortAscending = !this.sortAscending;
  //     } else {
  //       this.sortColumn = "max-ovr";
  //       this.sortAscending = false;
  //     }

  //     this.sortRows();
  //   });
  // }

  // private sortRows(): void {
  //   if (!this.dataRows || !this.sortColumn || !this.tbody) return;
  //   const tbody = this.tbody;

  //   const rows = Object.entries(this.dataRows).map(([playerId, row]) => {
  //     const player = this.roster.getPlayer(playerId);

  //     const ovrValue = player
  //       ? this.sortColumn === "min-ovr"
  //         ? player.getMinOvr()
  //         : player.getMaxOvr()
  //       : 0;

  //     const [firstName, lastName] = this.getRowPlayerName(row);

  //     return {
  //       row,
  //       ovrValue,
  //       firstName,
  //       lastName,
  //       playerId,
  //     };
  //   });

  //   const collator = new Intl.Collator(undefined, {
  //     usage: "sort",
  //     sensitivity: "base",
  //   });

  //   rows.sort((a, b) => {
  //     if (a.ovrValue !== b.ovrValue) {
  //       return this.sortAscending
  //         ? a.ovrValue - b.ovrValue
  //         : b.ovrValue - a.ovrValue;
  //     }

  //     const lastNameCompare = collator.compare(a.lastName, b.lastName);
  //     if (lastNameCompare !== 0) {
  //       return this.sortAscending ? lastNameCompare : -lastNameCompare;
  //     }

  //     return this.sortAscending
  //       ? collator.compare(a.firstName, b.firstName)
  //       : collator.compare(b.firstName, a.firstName);
  //   });

  //   rows.forEach((item) => {
  //     tbody.appendChild(item.row);
  //   });
  // }

  // --- Sorting Logic (Placeholder - Needs implementation) ---
  // private addSortingListenersToMinMaxHeaders(): void { ... }
  // private handleMinSortClick = () => { ... } // Use arrow fn or .bind(this)
  // private handleMaxSortClick = () => { ... }
  // private sortRows(): void { ... }
  // private getRowPlayerName(row: HTMLTableRowElement): [string, string] { ... }
}

const rosterVisualizerInstance = new RosterStatsVisualizer();

export function handleRosterData(data: any) {
  const newRoster = new Roster(data);
  // notify the visualizer instance about the new data
  rosterVisualizerInstance.updateRoster(newRoster);
}

export function manipulateRosterPage(el: HTMLElement) {
  rosterVisualizerInstance.attach(el);
}
