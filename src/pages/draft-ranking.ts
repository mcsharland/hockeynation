import { Roster } from "./roster";

declare global {
  interface Window {
    draftRankingData?: Roster | null;
  }
}

interface DraftCards {
  [id: string]: HTMLTableRowElement;
}

const DR_HIGHLIGHT_CLASS = "draft-ranking-highlight";
const DR_GHOST_TRIM = "draft-ranking-ghost-trim";
const DR_GHOST = "draft-ranking-ghost";

class DraftRankingVisualizer {
  private parent: HTMLElement | null = null;
  private draftRanking: Roster | null = null;
  private draftCards: DraftCards | null = null;
  private ovrTab: HTMLTableCellElement | null = null;
  private tableHR: HTMLTableRowElement | null = null;
  private picks: number[] | null = null;
  private tbody: HTMLTableElement | null = null;

  private dragStartListener: ((event: DragEvent) => void) | null = null;
  private dragEndListener: ((event: DragEvent) => void) | null = null;
  private highlightMutationObserver: MutationObserver | null = null;
  private highlightObserverTimeoutId: number | null = null;
  private highlightLast: boolean = false;
  private rowMutationObserver: MutationObserver | null = null;

  constructor() {}

  public attach(el: HTMLElement) {
    this.detach();

    this.parent = el;

    if (this.parent && this.draftRanking) {
      this.initializeTableReferences();
      this.attachEventListeners();
      this.attachRowObserver();
      this.renderColumns();
      this.applyColumnHighlights();
    } else {
      this.detach();
    }
  }

  public detach() {
    if (!this.parent) return;

    if (this.tbody) {
      if (this.dragStartListener)
        this.tbody.removeEventListener("dragstart", this.dragStartListener);
      if (this.dragEndListener)
        this.tbody.removeEventListener("dragend", this.dragEndListener);
    }

    if (this.rowMutationObserver) this.rowMutationObserver.disconnect();

    // this.disconnectHighlightObserver();
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
      this.applyColumnHighlights();
    }
  }

  public updatePicks(picks: number[]) {
    this.picks = picks;
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

    this.draftCards = {} as DraftCards; // reset reference

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

  private attachEventListeners() {
    if (!this.parent || !this.tbody) return;

    // only do this if its in the picks
    this.dragStartListener = (event: DragEvent) => {
      const row = event.target as HTMLTableRowElement;
      this.highlightLast = this.picks?.includes(row.rowIndex) ?? false;

      Array.from(row.children).forEach((el) => {
        el.classList.remove(DR_HIGHLIGHT_CLASS);
        if (el.hasAttribute("data-column"))
          el.classList.add(this.highlightLast ? DR_GHOST_TRIM : DR_GHOST);
      });
    };

    // needs to improve logic to when elements doesn't update a pick
    this.dragEndListener = (event: DragEvent) => {
      const row = event.target as HTMLTableRowElement;
      Array.from(row.children).forEach((el) => {
        if (el.hasAttribute("data-column")) {
          if (this.highlightLast) el.classList.add(DR_HIGHLIGHT_CLASS);
          el.classList.remove(DR_GHOST);
          el.classList.remove(DR_GHOST_TRIM);
        }
      });
      this.highlightLast = false;
      this.disconnectHighlightObserver();
      // is this the most unnecessary thing in the world? yes
      // does it ensure that there is no visual discrepancy to the user? also yes
      this.highlightMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                console.log("here");
                this.applyColumnHighlights();
                this.disconnectHighlightObserver();
              }
            });
          }
          // if (
          //   mutation.type === "attributes" &&
          //   mutation.attributeName === "class"
          // ) {
          //   console.log("here2");
          //   this.applyColumnHighlights();
          //   this.disconnectHighlightObserver();
          // }
        });
      });
      this.highlightMutationObserver.observe(row, {
        childList: true,
        subtree: true,
        attributes: true,
      });
      if (this.highlightObserverTimeoutId)
        clearTimeout(this.highlightObserverTimeoutId);
      this.highlightObserverTimeoutId = window.setTimeout(() => {
        this.disconnectHighlightObserver();
      }, 3000);
    };

    this.tbody.addEventListener("dragstart", this.dragStartListener);

    this.tbody.addEventListener("dragend", this.dragEndListener, {
      capture: true,
    });
  }

  private disconnectHighlightObserver(): void {
    if (this.highlightMutationObserver) {
      this.highlightMutationObserver.disconnect();
      this.highlightMutationObserver = null;
    }
    if (this.highlightObserverTimeoutId) {
      clearTimeout(this.highlightObserverTimeoutId);
      this.highlightObserverTimeoutId = null;
    }
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
                console.log("attempting to add columns");
                this.initializeTableReferences();
                this.renderColumns();
                this.applyColumnHighlights();
              }
            }
          });

          mutation.removedNodes.forEach((node) => {
            if (node instanceof HTMLTableCellElement && node.tagName === "TH") {
              const span = node.querySelector("span");
              if (span?.textContent?.trim() === "OVR") {
                console.log("attempting to remove columns");
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
    this.parent
      .querySelectorAll(`[data-column]`)
      .forEach((node) => node.remove());
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

    // remove previously added columns and their headers
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
      minDataCell.dataset.column = "min-ovr";

      const maxDataCell = document.createElement("td");
      maxDataCell.className = "px-4 text-center";
      maxDataCell.dataset.column = "max-ovr";

      minDataCell.appendChild(
        this.createRatingSpan(player.getMinOvr(), player.getIsScout()),
      );
      maxDataCell.appendChild(
        this.createRatingSpan(player.getMaxOvr(), player.getIsScout()),
      );

      row.insertBefore(maxDataCell, row.children[ovrIdx].nextSibling);
      row.insertBefore(minDataCell, row.children[ovrIdx].nextSibling);
    });
  }

  private applyColumnHighlights(): void {
    if (!this.parent || !this.picks) return;

    this.parent.querySelectorAll(`[data-column]`).forEach((node) => {
      node.classList.remove(DR_HIGHLIGHT_CLASS);
      if (
        this.picks?.includes(
          (node.parentElement as HTMLTableRowElement)?.rowIndex,
        )
      )
        node.classList.add(DR_HIGHLIGHT_CLASS);
    });
  }

  private createOvrLabelSpan(text: string): HTMLTableCellElement {
    const header = document.createElement("th");
    header.classList.add("px-4", "py-2");
    header.dataset.column = `${text.toLowerCase()}-ovr`;

    header.innerHTML = `<span>${text}</span>`;
    return header;
  }

  // modify to include empty fields
  private createRatingSpan(ovr: number, scout: boolean): HTMLSpanElement {
    const ratingSpan: HTMLSpanElement = document.createElement("span");
    if (scout && (!ovr || ovr <= 0)) {
      ratingSpan.innerText = "-";
      ratingSpan.style.color = "#555456";
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
}

const drVisualizerInstance = new DraftRankingVisualizer();

export function handleDraftRankingData(data: any) {
  const newDraftRanking = new Roster({ players: data });
  drVisualizerInstance.updateRanking(newDraftRanking);
}

export function handleDraftPickData(data: any) {
  const picks = data.map((pick: any) => pick.rank);
  drVisualizerInstance.updatePicks(picks);
}

export function manipulateDraftRankingPage(el: HTMLElement) {
  drVisualizerInstance.attach(el);
}
