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
  private roster: Roster;
  private parent: HTMLElement;
  private header: HTMLTableRowElement | null = null;
  private footer: HTMLTableRowElement | null = null;
  private dataRows: DataRow | null = null;
  private generalButton: HTMLButtonElement | null = null;
  private skillsButton: HTMLButtonElement | null = null;
  private tbody: HTMLTableSectionElement | null = null;
  private onGeneralPage: boolean = true;
  private minHeaderCell: HTMLTableCellElement | null = null;
  private maxHeaderCell: HTMLTableCellElement | null = null;
  private selectElement: HTMLSelectElement | null = null;
  private sortColumn: "min-ovr" | "max-ovr" | null = null;
  private sortAscending: boolean = true;

  constructor(roster: Roster, parentNode: HTMLElement) {
    this.roster = roster;
    this.parent = parentNode;
    this.initialize();
  }

  private initialize() {
    const tabButtons = this.parent.querySelectorAll(
      `.btn-toggle`,
    ) as NodeListOf<HTMLButtonElement>;
    if (!tabButtons.length) return;

    const isGeneral = tabButtons[0]?.textContent?.trim() === "General";
    this.generalButton = isGeneral ? tabButtons[0] : tabButtons[1];
    this.skillsButton = isGeneral ? tabButtons[1] : tabButtons[0];
    this.onGeneralPage = this.generalButton.classList.contains("active");

    // this.skillsButton =
    this.generalButton.addEventListener("click", (event) => {
      if (this.onGeneralPage) return;
      this.onGeneralPage = true;

      // re-initialize the table references since dom has changed
      this.initializeTableReferences();

      if (this.dataRows && Object.keys(this.dataRows).length > 0) {
        this.addNewColumns();
      }
      // if (this.sortColumn) this.sortRows()
    });

    this.skillsButton.addEventListener("click", (event) => {
      if (!this.onGeneralPage) return;
      this.onGeneralPage = false;
      this.initializeTableReferences();
      // if (this.sortColumn) this.sortRows();
    });

    this.selectElement = this.parent.querySelector(`select[value]`);
    this.selectElement?.addEventListener("input", () => {
      this.initializeTableReferences();
      this.addNewColumns();
    });

    // initialize table references and add columns on first load
    this.initializeTableReferences();
    if (this.dataRows && Object.keys(this.dataRows).length > 0) {
      this.addNewColumns();
    }
  }

  private initializeTableReferences() {
    // reset references to get the latest dom nodes

    this.header = this.parent.querySelector(`table thead tr`);
    this.footer = this.parent.querySelector(`table tfoot tr`);
    this.tbody = this.parent.querySelector("table tbody");

    const headerElements = this.header?.querySelectorAll(`th`);
    headerElements?.forEach((node) =>
      node.addEventListener("click", () => {
        this.sortColumn = null;
        this.sortAscending = false;
      }),
    );

    const rows = this.parent.querySelectorAll(`tbody tr`);
    const dr = {} as DataRow;

    rows.forEach((row) => {
      const tableRow = row as HTMLTableRowElement;
      const playerLink = tableRow.querySelector("a.player-link");
      if (playerLink?.getAttribute("href")) {
        const playerId =
          playerLink.getAttribute("href")!.split("/").pop() || "";
        dr[playerId] = tableRow;
      }
    });

    this.dataRows = dr;
  }

  private getRosterAvgOvr(ovrType: OvrType): number {
    const playerOvr = {
      Default: (player: Player) => player.getOvr(),
      Min: (player: Player) => player.getMinOvr(),
      Max: (player: Player) => player.getMaxOvr(),
    };
    const players = this.roster.getAllPlayers();

    const values = Object.values(players)
      .filter((player) => !player.getIsScout() || player.getOvr())
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
    if (scout && !ovr) {
      ratingSpan.classList.add("question-mark");
      ratingSpan.innerText = "?";
      ratingSpan.style.color = "#bcbabe";
    } else {
      ratingSpan.classList.add("badge");
      if (window.userData) {
        ratingSpan.style.color = window.userData.getColorPair(ovr)[1];
      }
      ratingSpan.style.userSelect = "none";

      if (window.userData) {
        const [bgColor, color] = window.userData.getColorPair(ovr);
        ratingSpan.style.backgroundColor = bgColor;
        ratingSpan.style.color = color;
      }
      ratingSpan.innerText = ovr.toString();
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

  private addNewColumns(): void {
    if (!this.onGeneralPage || !this.dataRows || !this.header || !this.footer)
      return;

    // delete old columns
    this.parent
      .querySelectorAll(`[data-column]`)
      .forEach((node) => node.remove());

    Object.entries(this.dataRows).forEach(([playerId, row]) => {
      const player = this.roster.getPlayer(playerId);
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

      row.insertBefore(minDataCell, null);
      row.insertBefore(maxDataCell, null);
    });

    this.minHeaderCell = document.createElement("th");
    this.minHeaderCell.className = "md:px-4 px-2 py-2 text-left sort-column";
    this.minHeaderCell.innerText = " Min ";
    this.minHeaderCell.style.textAlign = "center";
    this.minHeaderCell.dataset.column = "min-ovr";

    this.maxHeaderCell = document.createElement("th");
    this.maxHeaderCell.className = "md:px-4 px-2 py-2 text-left sort-column";
    this.maxHeaderCell.innerText = " Max ";
    this.maxHeaderCell.style.textAlign = "center";
    this.maxHeaderCell.dataset.column = "max-ovr";

    this.header.insertBefore(this.minHeaderCell, null);
    this.header.insertBefore(this.maxHeaderCell, null);

    const minFooterCell = document.createElement("td");
    minFooterCell.className = "md:px-4 px-2 py-2";
    minFooterCell.dataset.column = "min-ovr";

    minFooterCell.appendChild(
      this.createRatingSpan(this.getRosterAvgOvr("Min"), false),
    );

    const maxFooterCell = document.createElement("td");
    maxFooterCell.className = "md:px-4 px-2 py-2";
    maxFooterCell.dataset.column = "max-ovr";

    maxFooterCell.appendChild(
      this.createRatingSpan(this.getRosterAvgOvr("Max"), false),
    );

    this.footer.insertBefore(minFooterCell, null);
    this.footer.insertBefore(maxFooterCell, null);

    // this.addSorting();
  }
}

export function handleRosterData(data: any) {
  window.rosterData = new Roster(data);
  const event = new CustomEvent("rosterDataReady");
  window.dispatchEvent(event);
}

export function manipulateRosterPage(el: HTMLElement) {
  if (window.rosterData) {
    new RosterStatsVisualizer(window.rosterData, el);
  } else {
    const handler = () => {
      new RosterStatsVisualizer(window.rosterData!, el);
      window.removeEventListener("rosterDataReady", handler);
    };
    window.addEventListener("rosterDataReady", handler);
  }
}
