import { Roster } from "./roster";

interface DraftCards {
  [id: string]: HTMLElement;
}

class DraftClassVisualizer {
  private parent: HTMLElement | null = null;
  private draftClass: Roster | null = null;
  private draftCards: DraftCards | null = null;

  private toggleButtonListener: (() => void) | null = null;
  private paginationButtonListeners: Map<HTMLButtonElement, () => void> =
    new Map();
  private selectMenuListeners: Map<HTMLSelectElement, () => void> = new Map();
  private mutationObserver: MutationObserver | null = null;
  private observerTimeoutId: number | null = null;

  constructor() {}

  public attach(el: HTMLElement) {
    this.detach(); // clean up any previous state/listeners

    this.parent = el;

    if (this.parent && this.draftClass) {
      this.initializeDOMReferences(); // Find cards within the new parent
      this.attachEventListeners(); // Add listeners within the new parent scope
      this.addBadges(); // Add badges based on current data/DOM
    }
  }

  public detach() {
    if (!this.parent) return;

    const toggleButton = document.querySelectorAll(`.btn-toggle`)[1] as
      | HTMLButtonElement
      | undefined;
    if (toggleButton && this.toggleButtonListener) {
      toggleButton.removeEventListener("click", this.toggleButtonListener);
      this.toggleButtonListener = null;
    }

    // remove pagination listeners
    this.paginationButtonListeners.forEach((listener, button) => {
      button.removeEventListener("click", listener);
    });
    this.paginationButtonListeners.clear();

    // remove select menu listeners and observer
    this.selectMenuListeners.forEach((listener, select) => {
      select.removeEventListener("change", listener);
    });
    this.selectMenuListeners.clear();
    this.disconnectObserver(); // disconnect observer if active

    this.parent = null;
    this.draftCards = null;
  }

  public updateData(newData: Roster | null) {
    this.draftClass = newData;

    if (this.parent) {
      this.initializeDOMReferences();
      this.addBadges();
    }
  }

  private initializeDOMReferences(): void {
    if (!this.parent) return;

    const rows = this.parent.querySelectorAll("[id^='draftee-card']");
    const dc = {} as DraftCards;

    rows.forEach((row) => {
      const card = row as HTMLElement;

      const playerLink = card.querySelector(`a[href^='/player/']`);
      const badge = card.querySelector(".badge"); // needed by addBadges later

      if (!playerLink || !badge) return;

      const playerId = playerLink.getAttribute("href")?.split("/").pop();
      if (playerId) {
        dc[playerId] = card;
      }
    });

    this.draftCards = dc;
  }

  private attachEventListeners(): void {
    if (!this.parent) return;

    const toggleButton = document.querySelectorAll(`.btn-toggle`)[1] as
      | HTMLButtonElement
      | undefined;
    if (toggleButton) {
      this.toggleButtonListener = () => {
        this.initializeDOMReferences();
        this.addBadges();
      };
      toggleButton.addEventListener("click", this.toggleButtonListener);
    }

    this.paginationButtonListeners.clear(); // clear map before adding
    const buttons = Array.from(this.parent.querySelectorAll("button")).filter(
      (btn) => {
        const hasMatchingSpan = Array.from(btn.querySelectorAll("span")).some(
          (span) =>
            /^(1|21|41|61|81)-\d+$/.test(span.textContent?.trim() ?? ""),
        );

        const buttonText = Array.from(btn.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.trim())
          .join("");
        const hasMatchingDirectText = /^(1|21|41|61|81)-\d+$/.test(buttonText);

        return hasMatchingSpan || hasMatchingDirectText;
      },
    );

    buttons.forEach((button) => {
      const listener = () => {
        this.initializeDOMReferences();
        this.addBadges();
      };
      button.addEventListener("click", listener);
      this.paginationButtonListeners.set(button, listener); // store for removal
    });

    this.selectMenuListeners.clear();
    this.parent.querySelectorAll("select").forEach((menu) => {
      const listener = () => {
        this.disconnectObserver(); // disconnect previous observer

        this.mutationObserver = new MutationObserver((mutations) => {
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
            this.initializeDOMReferences();
            this.addBadges();
            this.disconnectObserver();
          }
        });

        this.mutationObserver.observe(this.parent!, {
          childList: true,
          subtree: true,
        });

        if (this.observerTimeoutId) clearTimeout(this.observerTimeoutId);
        this.observerTimeoutId = window.setTimeout(() => {
          this.disconnectObserver();
        }, 3000); // 3 seconds
      };
      menu.addEventListener("change", listener);
      this.selectMenuListeners.set(menu, listener);
    });
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

  private addBadges(): void {
    // Adds Min/Max badges to draft cards
    if (!this.draftCards || !this.draftClass) return;

    Object.entries(this.draftCards).forEach(([playerId, card]) => {
      // //safety
      if (card.getAttribute("data-ovr-badges-added") === "true") return;

      const badgeContainer = card.querySelector(`.badge`)?.parentElement;
      if (!badgeContainer) return;

      const player = this.draftClass!.getPlayer(playerId); // draftClass checked above
      if (!player) return;

      badgeContainer
        .querySelectorAll(".dynamic-ovr-label, .dynamic-ovr-badge")
        .forEach((el) => el.remove());

      // Add MIN
      badgeContainer.appendChild(this.createOvrLabelSpan("MIN"));
      badgeContainer.appendChild(this.createRatingSpan(player.getMinOvr()));

      // Add MAX
      badgeContainer.appendChild(this.createOvrLabelSpan("MAX"));
      badgeContainer.appendChild(this.createRatingSpan(player.getMaxOvr()));

      card.setAttribute("data-ovr-badges-added", "true");
    });
  }

  private createOvrLabelSpan(text: string): HTMLSpanElement {
    const label = document.createElement("span");
    // add a class to make it easier to remove later
    label.classList.add(
      "dynamic-ovr-label",
      "uppercase",
      "ml-3",
      "xs:inline-block",
      "hidden",
    );
    label.innerText = text;
    return label;
  }

  private createRatingSpan(ovr: number): HTMLSpanElement {
    const ratingSpan = document.createElement("span");
    // add a class to make it easier to remove later
    ratingSpan.classList.add("dynamic-ovr-badge", "badge", "ml-1");
    ratingSpan.style.userSelect = "none";

    if (
      window.userData &&
      typeof window.userData.getColorPair === "function" &&
      ovr > 0
    ) {
      try {
        const [bgColor, color] = window.userData.getColorPair(ovr);
        ratingSpan.style.backgroundColor = bgColor;
        ratingSpan.style.color = color;
      } catch (e) {
        console.error("Error getting color pair for OVR:", ovr, e);
      }
    }
    ratingSpan.innerText = ovr > 0 ? ovr.toString() : "?"; // Show ? if OVR is 0, shouldn't ever be needed
    return ratingSpan;
  }
}

const draftVisualizerInstance = new DraftClassVisualizer();

export function handleDraftClassData(data: any) {
  const rosterData = { ...data, players: data.draftees };
  const newRoster = new Roster(rosterData);

  draftVisualizerInstance.updateData(newRoster);
}

export function manipulateDraftClassPage(el: HTMLElement) {
  draftVisualizerInstance.attach(el);
}
