import { Roster } from "./roster";

declare global {
  interface Window {
    draftRankingData?: Roster | null;
  }
}

interface DraftCards {
  [id: string]: HTMLTableRowElement;
}

let visualizerInstance: DraftRankingVisualizer | null = null;

class DraftRankingVisualizer {
  private parent: HTMLElement;
  private draftRanking: Roster | null = null;
  private draftCards: DraftCards | null = null;
  private ovrTab: HTMLTableCellElement | null = null;
  private tableHR: HTMLTableRowElement | null = null;

  constructor(el: HTMLElement) {
    this.parent = el;

    window.addEventListener(
      "draftRankingDataUpdated",
      this.onDataUpdated.bind(this),
    );

    if (window.draftRankingData) {
      this.draftRanking = window.draftRankingData;
      this.initialize();
    }
  }

  private onDataUpdated() {
    if (window.draftRankingData) {
      this.draftRanking = window.draftRankingData;
      this.initializeReferences();
    }
  }

  private initialize() {
    this.initializeReferences();
  }

  private initializeReferences() {
    if (!this.draftRanking) return;

    this.tableHR = this.parent.querySelector(`table thead tr`);

    if (!this.tableHR) return;

    this.ovrTab =
      (Array.from(this.tableHR.querySelectorAll(`th span`)).filter(
        (span) => span.textContent?.trim() === "OVR",
      )?.[0]?.parentElement as HTMLTableCellElement) ?? null;

    if (!this.ovrTab) return;

    const rows = this.parent.querySelectorAll(`table tbody tr`);
    const dc = {} as DraftCards;

    rows.forEach((row) => {
      const tableRow = row as HTMLTableRowElement;

      const playerLink = tableRow.querySelectorAll(`a`)[1];
      if (playerLink?.getAttribute("href")) {
        const playerId =
          playerLink.getAttribute("href")!.split("/").pop() || "";
        dc[playerId] = tableRow;
      }
    });

    this.draftCards = dc;
    console.log(this.draftCards);

    this.addRows();
  }

  private addRows() {
    if (!this.tableHR || !this.ovrTab || !this.draftCards) return;

    const tabElement = this.ovrTab;
    const headerRow = tabElement.parentElement;
    if (!headerRow) return;
    const ovrIdx = Array.from(headerRow.children).indexOf(tabElement);

    const minHeader = this.createOvrLabelSpan("MIN");

    const maxHeader = this.createOvrLabelSpan("MAX");

    this.tableHR.insertBefore(maxHeader, this.ovrTab.nextSibling);
    this.tableHR.insertBefore(minHeader, this.ovrTab.nextSibling);

    Object.entries(this.draftCards).forEach(([playerId, row]) => {
      const player = this.draftRanking?.getPlayer(playerId);
      if (!player) return;

      const minDataCell = document.createElement("td");
      minDataCell.className = "px-4 text-center";
      minDataCell.appendChild(this.createRatingSpan(player.getMinOvr()));

      const maxDataCell = document.createElement("td");
      maxDataCell.className = "px-4 text-center";
      maxDataCell.appendChild(this.createRatingSpan(player.getMaxOvr()));

      row.insertBefore(maxDataCell, row.children[ovrIdx]);
      row.insertBefore(minDataCell, row.children[ovrIdx]);
    });
  }

  private createOvrLabelSpan(text: string): HTMLTableCellElement {
    const header = document.createElement("th");
    header.classList.add("px-4", "py-2");
    header.innerHTML = `<span>${text}</span>`;
    return header;
  }

  // modify to include empty fields
  private createRatingSpan(ovr: number): HTMLSpanElement {
    const ratingSpan: HTMLSpanElement = document.createElement("span");
    if (!ovr) {
      ratingSpan.innerText = "-";
      ratingSpan.style.color = "#555456";
      ratingSpan.style.textAlign = "center";
    } else {
      ratingSpan.classList.add("badge");
      ratingSpan.style.userSelect = "none";
      if (window.userData) {
        ratingSpan.style.backgroundColor = window.userData.getColorPair(ovr)[0];
        ratingSpan.style.color = window.userData.getColorPair(ovr)[1];
      }
      ratingSpan.innerText = ovr.toString();
    }
    return ratingSpan;
  }
}

export function handleDraftRankingData(data: any) {
  const isUpdate = !!window.draftRankingData;
  window.draftRankingData = new Roster({ players: data });

  const eventName = isUpdate
    ? "draftRankingDataUpdated"
    : "draftRankingDataReady";
  const event = new CustomEvent(eventName);
  window.dispatchEvent(event);
}

export function manipulateDraftRankingPage(el: HTMLElement) {
  if (!visualizerInstance) {
    if (window.draftRankingData) {
      visualizerInstance = new DraftRankingVisualizer(el);
    } else {
      const handler = () => {
        visualizerInstance = new DraftRankingVisualizer(el);
        window.removeEventListener("draftRankingDataReady", handler);
      };
      window.addEventListener("draftRankingDataReady", handler);
    }
  }
}
