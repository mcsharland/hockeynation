import { ObserverManager } from "./observer-handler";
import { manipulateDraftClassPage } from "./pages/draft-class";
import { manipulatePlayerPage } from "./pages/player";
import { manipulateRosterPage } from "./pages/roster";

type MutationHandler = (element: HTMLElement) => void;

interface PageHandler {
  url: string;
  selector: string;
  handler: MutationHandler;
}

const PAGE_HANDLERS: Record<string, PageHandler> = {
  player: {
    url: "https://hockey-nation.com/player",
    selector: "table tbody tr",
    handler: (el) => {
      manipulatePlayerPage(el);
    },
  },
  roster: {
    url: "https://hockey-nation.com/club/roster",
    selector: "table tbody tr",
    handler: (el) => {
      manipulateRosterPage(el);
    },
  },
  draftClass: {
    url: "https://hockey-nation.com/office/draft-center",
    selector: ".stats-container",
    handler: (el) => {
      manipulateDraftClassPage(el);
    },
  },
};

function findPageHandler(url: string): PageHandler | null {
  for (const page of Object.values(PAGE_HANDLERS)) {
    if (url.startsWith(page.url)) {
      return page;
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
  const pageHandler = findPageHandler(url);

  // reset previous observer
  ObserverManager.getInstance().resetCallback();

  // set new callback if we have a handler for the page
  if (pageHandler) {
    ObserverManager.getInstance().setCallback(
      pageHandler.selector,
      pageHandler.handler,
    );
  }
}
