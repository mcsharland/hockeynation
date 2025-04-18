import { Roster } from "./roster";

declare global {
  interface Window {
    draftClassData?: Roster | null;
  }
}

interface DraftCards {
  [id: string]: HTMLElement;
}

let visualizerInstance: DraftClassVisualizer | null = null;

class DraftClassVisualizer {
  private parent: HTMLElement;
  private draftClass: Roster | null = null;
  private draftCards: DraftCards | null = null;

  constructor(el: HTMLElement) {
    this.parent = el;
    window.addEventListener(
      "draftClassDataUpdated",
      this.onDataUpdated.bind(this),
    );

    if (window.draftClassData) {
      this.draftClass = window.draftClassData;
      this.initializeReferences();
    }
    this.initialize();
  }

  private onDataUpdated(): void {
    if (window.draftClassData) {
      this.draftClass = window.draftClassData;
      this.initializeReferences(); //reprocess with new data
    }
  }

  private initialize(): void {
    document
      .querySelectorAll(`.btn-toggle`)[1]
      .addEventListener("click", () => {
        this.initializeReferences();
      });

    this.initializeReferences();

    // select pagination buttons
    const buttons = Array.from(this.parent.querySelectorAll("button")).filter(
      (btn) => {
        // select top buttons matching pattern
        const hasMatchingSpan = Array.from(btn.querySelectorAll("span")).some(
          (span) =>
            /^(1|21|41|61|81)-\d+$/.test(span.textContent?.trim() ?? ""),
        );

        // select buttom buttons matching pattern because theyre different for some reason
        const buttonText =
          btn.childNodes.length > 0
            ? Array.from(btn.childNodes)
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent?.trim())
                .join("")
            : "";

        const hasMatchingDirectText = /^(1|21|41|61|81)-\d+$/.test(buttonText);

        return hasMatchingSpan || hasMatchingDirectText;
      },
    );

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        this.initializeReferences();
      });
    });

    this.parent.querySelectorAll("select").forEach((menu) => {
      menu.addEventListener("change", () => {
        const observer = new MutationObserver((mutations) => {
          const hasRelevantChanges = mutations.some(
            (mutation) =>
              mutation.addedNodes.length > 0 &&
              Array.from(mutation.addedNodes).some(
                (node) =>
                  node.nodeType === Node.ELEMENT_NODE &&
                  (node as Element).querySelector('[id^="draftee-card"]'),
              ),
          );

          if (hasRelevantChanges) {
            this.initializeReferences();
            // disconnect if changes found
            observer.disconnect();
          }
        });

        observer.observe(this.parent, {
          childList: true,
          subtree: true,
        });

        setTimeout(() => {
          observer.disconnect();
        }, 3000);
      });
    });
  }

  private initializeReferences(): void {
    const rows = this.parent.querySelectorAll("[id^='draftee-card']");

    const dc = {} as DraftCards;

    rows.forEach((row) => {
      const card = row as HTMLElement;
      const badge = row.querySelector(".badge");
      if (!badge) return;
      const playerId = row
        .querySelector(`a[href^='/player/']`)
        ?.getAttribute("href")
        ?.split("/")
        .pop();

      if (!playerId) return;

      dc[playerId] = card;
    });

    this.draftCards = dc;

    this.addBadges();
  }

  private addBadges(): void {
    if (!this.draftCards || !this.draftClass) return;

    Object.entries(this.draftCards).forEach(([playerId, card]) => {
      if (card.getAttribute("data-ovr-badges-added") === "true") return;
      const badge = card.querySelector(`.badge`);
      if (!badge) return;
      const player = this.draftClass?.getPlayer(playerId);
      if (!player) return;

      card.setAttribute("data-ovr-badges-added", "true");

      badge.parentElement?.insertBefore(this.createOvrLabelSpan("MIN"), null);
      badge.parentElement?.insertBefore(
        this.createRatingSpan(player.getMinOvr()),
        null,
      );

      badge.parentElement?.insertBefore(this.createOvrLabelSpan("MAX"), null);
      badge.parentElement?.insertBefore(
        this.createRatingSpan(player.getMaxOvr()),
        null,
      );
    });
  }

  private createOvrLabelSpan(text: string): HTMLSpanElement {
    const label = document.createElement("span");
    label.classList.add("uppercase", "ml-3", "xs:inline-block", "hidden");
    label.innerText = text;
    return label;
  }

  private createRatingSpan(ovr: number): HTMLSpanElement {
    const ratingSpan = document.createElement("span");
    ratingSpan.classList.add("badge", "ml-1");
    ratingSpan.style.userSelect = "none";
    if (window.userData) {
      ratingSpan.style.backgroundColor = window.userData.getColorPair(ovr)[0];
      ratingSpan.style.color = window.userData.getColorPair(ovr)[1];
    }
    ratingSpan.innerText = ovr.toString();
    return ratingSpan;
  }
}

export function handleDraftClassData(data: any) {
  const isUpdate = !!window.draftClassData; // check if this is an update
  window.draftClassData = new Roster({ ...data, players: data.draftees });

  const eventName = isUpdate ? "draftClassDataUpdated" : "draftClassDataReady";
  const event = new CustomEvent(eventName);
  window.dispatchEvent(event);
}

export function manipulateDraftClassPage(el: HTMLElement) {
  if (!visualizerInstance) {
    // For initial data loading, check if data exists or wait for it
    if (window.draftClassData) {
      visualizerInstance = new DraftClassVisualizer(el);
    } else {
      // Wait for initial data before creating instance
      const handler = () => {
        visualizerInstance = new DraftClassVisualizer(el);
        window.removeEventListener("draftClassDataReady", handler);
      };
      window.addEventListener("draftClassDataReady", handler);
    }
  }
}
