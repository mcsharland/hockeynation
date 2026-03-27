import { ObserverManager } from "./observer-handler";
import { manipulateDraftClassPage } from "./pages/draft-class";
import { manipulateDraftRankingPage } from "./pages/draft-ranking";
import { manipulatePlayerPage } from "./pages/player";
import { manipulateRosterPage } from "./pages/roster";
import { manipulateCoachMarketPage } from "./pages/coach-market";
import { manipulateFreeAgentCenterPage } from "./pages/free-agent-center";
import { manipulateCoachingStaffPage } from "./pages/coaching-staff";

type MutationHandler = (element: HTMLElement) => void;

export interface SelectorHandler {
    selector: string;
    handler: MutationHandler;
}
type PageHandlers = { url: string; handlers: SelectorHandler[] };

const PAGE_HANDLERS: Record<string, PageHandlers> = {
    // player: {
    //     url: "https://hockey-nation.com/player",
    //     handlers: [
    //         {
    //             selector: "table tbody tr",
    //             handler: (el) => {
    //                 manipulatePlayerPage(el);
    //             },
    //         },
    //     ],
    // },
    roster: {
        url: "https://hockey-nation.com/club/roster",
        handlers: [
            {
                selector: "table tbody tr",
                handler: (el) => {
                    manipulateRosterPage(el);
                },
            },
        ],
    },
    draftClass: {
        url: "https://hockey-nation.com/office/draft-center",
        handlers: [
            {
                selector: ".stats-container",
                handler: (el) => {
                    manipulateDraftClassPage(el);
                },
            },
        ],
    },
    draftRanking: {
        url: "https://hockey-nation.com/draft-ranking",
        handlers: [
            {
                selector: "table tbody tr",
                handler: (el) => {
                    manipulateDraftRankingPage(el);
                },
            },
        ],
    },
    coachMarket: {
        url: "https://hockey-nation.com/coaching-staff",
        handlers: [
            // Coach Market
            {
                selector: "div[market-open] table tbody tr",
                handler: (el) => {
                    manipulateCoachMarketPage(el);
                },
            },
            // Coaching Staff
            {
                selector: ".market-stats-grid.by-experience",
                handler: (el) => {
                    manipulateCoachingStaffPage(el);
                },
            },
        ],
    },
    freeAgentCenter: {
        url: "https://hockey-nation.com/office/free-agent-center",
        handlers: [
            {
                selector: "div.card.card-secondary",
                handler: (el) => {
                    manipulateFreeAgentCenterPage(el);
                },
            },
        ],
    },
};

function findPageHandler(url: string): SelectorHandler[] | null {
    for (const page of Object.values(PAGE_HANDLERS)) {
        if (url.startsWith(page.url)) {
            return page.handlers;
        }
    }
    return null;
}

export function initNavigationHandler() {
    handleNavigation();

    // @ts-ignore
    window.navigation.addEventListener("currententrychange", handleNavigation);
}

function handleNavigation() {
    const url = window.location.href;
    const pageHandlers = findPageHandler(url);

    // reset previous observer
    ObserverManager.getInstance().resetCallback();

    // set new callbacks if we have handlers for the page
    if (pageHandlers) {
        ObserverManager.getInstance().setCallbacks(pageHandlers);
    }
}
