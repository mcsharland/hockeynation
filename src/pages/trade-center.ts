/*
 * Basically the exact same as the FreeAgentCenter Page
 * Kept decoupled to be flexible to site changes in the future
 */

import { Roster } from "./roster";

interface TradePlayerCards {
    [id: string]: HTMLElement;
}

class TradeVisualizer {
    private container: HTMLElement | null = null;
    private tradePlayers: Roster | null = null;
    private tradePlayerCards: TradePlayerCards | null = null;

    private paginationListeners: Map<HTMLElement, () => void> = new Map();
    private mutationObserver: MutationObserver | null = null;
    private observerTimeoutId: number | null = null;

    constructor() {}

    public attach(el: HTMLElement) {
        this.detach();

        this.container = el.parentElement;
        if (!this.container) return;
        if (!this.tradePlayers) return;

        this.initializeDOMReferences();
        this.attachPaginationListeners();
        this.addBadges();
    }

    public detach() {
        if (!this.container) return;

        this.detachPaginationListeners();
        this.disconnectObserver();

        this.container = null;
        this.tradePlayerCards = null;
    }

    public updateData(newData: Roster | null) {
        this.tradePlayers = newData;

        if (this.container) {
            this.initializeDOMReferences();
            this.addBadges();
        }
    }

    public onDataReceived(): void {
        if (!this.container) return;
        this.onTableUpdateTrigger();
    }

    private getPaginationContainers(): HTMLElement[] {
        if (!this.container) return [];

        const paginationDivs = this.container.querySelectorAll<HTMLElement>(
            "div.flex.justify-center.bg-gray-700",
        );

        return Array.from(paginationDivs);
    }

    private initializeDOMReferences(): void {
        if (!this.container) return;

        const cards = this.container.querySelectorAll(
            "div.card.card-secondary",
        );

        const tc: TradePlayerCards = {};

        cards.forEach((card) => {
            const cardEl = card as HTMLElement;

            const playerLink = cardEl.querySelector("a[href^='/player/']");
            const badge = cardEl.querySelector(".badge");

            if (!playerLink || !badge) return;

            const playerId = playerLink.getAttribute("href")?.split("/").pop();
            if (playerId) tc[playerId] = cardEl;
        });

        this.tradePlayerCards = tc;
    }

    private attachPaginationListeners(): void {
        if (!this.container) return;

        this.detachPaginationListeners();

        const containers = this.getPaginationContainers();

        containers.forEach((container) => {
            const pageLinks = container.querySelectorAll<HTMLAnchorElement>(
                "li a:not(.disabled)",
            );

            pageLinks.forEach((el) => {
                const listener = () => {
                    this.onTableUpdateTrigger();
                };
                el.addEventListener("click", listener);
                this.paginationListeners.set(el, listener);
            });
        });
    }

    private detachPaginationListeners(): void {
        this.paginationListeners.forEach((listener, el) => {
            el.removeEventListener("click", listener);
        });
        this.paginationListeners.clear();
    }

    private onTableUpdateTrigger(): void {
        if (this.observerTimeoutId) {
            clearTimeout(this.observerTimeoutId);
            this.observerTimeoutId = null;
        }

        if (!this.mutationObserver && this.container) {
            this.mutationObserver = new MutationObserver((mutations) => {
                if (!this.container?.isConnected) {
                    this.detach();
                    return;
                }

                const hasRelevantChanges = mutations.some(
                    (m) =>
                        m.addedNodes.length > 0 &&
                        Array.from(m.addedNodes).some(
                            (node) =>
                                node.nodeType === Node.ELEMENT_NODE &&
                                ((node as Element).classList?.contains(
                                    "card",
                                ) ||
                                    (node as Element).querySelector(
                                        "div.card.card-secondary",
                                    )),
                        ),
                );

                if (hasRelevantChanges) this.onTableUpdated();
            });
            this.mutationObserver.observe(this.container, {
                childList: true,
                subtree: true,
            });
        }
        this.observerTimeoutId = window.setTimeout(() => {
            this.onTableUpdated();
        }, 3000);
    }

    private onTableUpdated(): void {
        this.disconnectObserver();
        this.initializeDOMReferences();
        this.addBadges();
        this.attachPaginationListeners();
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
        if (!this.tradePlayerCards || !this.tradePlayers) return;

        Object.entries(this.tradePlayerCards).forEach(([playerId, card]) => {
            if (card.getAttribute("data-ovr-badges-added") === "true") return;

            const badgeContainer = card.querySelector(".badge")?.parentElement;
            if (!badgeContainer) return;

            const player = this.tradePlayers!.getPlayer(playerId);
            if (!player) return;

            badgeContainer
                .querySelectorAll(".dynamic-ovr-label, .dynamic-ovr-badge")
                .forEach((el) => el.remove());

            // Add MIN
            badgeContainer.appendChild(this.createOvrLabelSpan("MIN"));
            badgeContainer.appendChild(
                this.createRatingSpan(player.getMinOvr()),
            );

            // Add MAX
            badgeContainer.appendChild(this.createOvrLabelSpan("MAX"));
            badgeContainer.appendChild(
                this.createRatingSpan(player.getMaxOvr()),
            );

            card.setAttribute("data-ovr-badges-added", "true");
        });
    }

    private createOvrLabelSpan(text: string): HTMLSpanElement {
        const label = document.createElement("span");
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
        ratingSpan.classList.add("dynamic-ovr-badge", "badge", "ml-1");
        ratingSpan.style.userSelect = "none";
        ratingSpan.innerText = ovr.toString();

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

        return ratingSpan;
    }
}

const tradeVisualizerInstance = new TradeVisualizer();

export function handleTradeCenterData(data: any[]) {
    const rosterData = { players: data };
    const newRoster = new Roster(rosterData);

    tradeVisualizerInstance.updateData(newRoster);
    tradeVisualizerInstance.onDataReceived();
}

export function manipulateTradeCenterPage(el: HTMLElement) {
    tradeVisualizerInstance.attach(el);
}
