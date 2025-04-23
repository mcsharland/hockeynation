/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/mappings/skill-mappings.ts":
/*!****************************************!*\
  !*** ./src/mappings/skill-mappings.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SKILL_NAME_TO_ID: () => (/* binding */ SKILL_NAME_TO_ID)
/* harmony export */ });
const SKILL_NAME_TO_ID = {
    Skating: "SKA",
    Reflexes: "REF",
    Endurance: "END",
    Power: "PWR",
    Positioning: "POS",
    Shooting: "SHO",
    Pads: "PAD",
    Passing: "PAS",
    Glove: "GLO",
    Defending: "DEF",
    Blocker: "BLO",
    Checking: "CHK",
    Stick: "STK",
    Discipline: "DSC",
    Faceoffs: "FOF",
};


/***/ }),

/***/ "./src/navigation-handler.ts":
/*!***********************************!*\
  !*** ./src/navigation-handler.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   initNavigationHandler: () => (/* binding */ initNavigationHandler)
/* harmony export */ });
/* harmony import */ var _observer_handler__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./observer-handler */ "./src/observer-handler.ts");
/* harmony import */ var _pages_draft_class__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./pages/draft-class */ "./src/pages/draft-class.ts");
/* harmony import */ var _pages_draft_ranking__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./pages/draft-ranking */ "./src/pages/draft-ranking.ts");
/* harmony import */ var _pages_player__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./pages/player */ "./src/pages/player.ts");
/* harmony import */ var _pages_roster__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./pages/roster */ "./src/pages/roster.ts");





const PAGE_HANDLERS = {
    player: {
        url: "https://hockey-nation.com/player",
        selector: "table tbody tr",
        handler: (el) => {
            (0,_pages_player__WEBPACK_IMPORTED_MODULE_3__.manipulatePlayerPage)(el);
        },
    },
    roster: {
        url: "https://hockey-nation.com/club/roster",
        selector: "table tbody tr",
        handler: (el) => {
            (0,_pages_roster__WEBPACK_IMPORTED_MODULE_4__.manipulateRosterPage)(el);
        },
    },
    draftClass: {
        url: "https://hockey-nation.com/office/draft-center",
        selector: ".stats-container",
        handler: (el) => {
            (0,_pages_draft_class__WEBPACK_IMPORTED_MODULE_1__.manipulateDraftClassPage)(el);
        },
    },
    draftRanking: {
        url: "https://hockey-nation.com/draft-ranking",
        selector: "table tbody tr",
        handler: (el) => {
            (0,_pages_draft_ranking__WEBPACK_IMPORTED_MODULE_2__.manipulateDraftRankingPage)(el);
        },
    },
};
function findPageHandler(url) {
    for (const page of Object.values(PAGE_HANDLERS)) {
        if (url.startsWith(page.url)) {
            return page;
        }
    }
    return null;
}
function initNavigationHandler() {
    handleNavigation();
    // @ts-ignore
    window.navigation.addEventListener("currententrychange", handleNavigation);
}
function handleNavigation() {
    const url = window.location.href;
    const pageHandler = findPageHandler(url);
    // reset previous observer
    _observer_handler__WEBPACK_IMPORTED_MODULE_0__.ObserverManager.getInstance().resetCallback();
    // set new callback if we have a handler for the page
    if (pageHandler) {
        _observer_handler__WEBPACK_IMPORTED_MODULE_0__.ObserverManager.getInstance().setCallback(pageHandler.selector, pageHandler.handler);
    }
}


/***/ }),

/***/ "./src/observer-handler.ts":
/*!*********************************!*\
  !*** ./src/observer-handler.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ObserverManager: () => (/* binding */ ObserverManager)
/* harmony export */ });
class ObserverManager {
    static instance;
    observer = null;
    currentSelector = null;
    currentCallback = null;
    constructor() { } //singleton
    static getInstance() {
        if (!ObserverManager.instance) {
            ObserverManager.instance = new ObserverManager();
        }
        return ObserverManager.instance;
    }
    setCallback(selector, callback) {
        this.currentSelector = selector;
        this.currentCallback = callback;
        this.ensureObserverActive();
    }
    resetCallback() {
        this.currentSelector = null;
        this.currentCallback = null;
    }
    ensureObserverActive() {
        if (!this.observer) {
            this.observer = new MutationObserver((mutations) => {
                const currentSelector = this.currentSelector;
                const currentCallback = this.currentCallback;
                if (!currentSelector || !currentCallback)
                    return;
                mutations.forEach((mutation) => {
                    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const element = node;
                                const target = element.querySelector(currentSelector);
                                if (target) {
                                    currentCallback(element);
                                    this.disconnect();
                                }
                            }
                        });
                    }
                });
            });
            this.observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }
    }
    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}


/***/ }),

/***/ "./src/pages/draft-class.ts":
/*!**********************************!*\
  !*** ./src/pages/draft-class.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   handleDraftClassData: () => (/* binding */ handleDraftClassData),
/* harmony export */   manipulateDraftClassPage: () => (/* binding */ manipulateDraftClassPage)
/* harmony export */ });
/* harmony import */ var _roster__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./roster */ "./src/pages/roster.ts");

class DraftClassVisualizer {
    parent = null;
    draftClass = null;
    draftCards = null;
    toggleButtonListener = null;
    paginationButtonListeners = new Map();
    selectMenuListeners = new Map();
    mutationObserver = null;
    observerTimeoutId = null;
    constructor() { }
    attach(el) {
        this.detach(); // clean up any previous state/listeners
        this.parent = el;
        if (this.parent && this.draftClass) {
            this.initializeDOMReferences(); // Find cards within the new parent
            this.attachEventListeners(); // Add listeners within the new parent scope
            this.addBadges(); // Add badges based on current data/DOM
        }
    }
    detach() {
        if (!this.parent)
            return;
        const toggleButton = document.querySelectorAll(`.btn-toggle`)[1];
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
    updateData(newData) {
        this.draftClass = newData;
        if (this.parent) {
            this.initializeDOMReferences();
            this.addBadges();
        }
    }
    initializeDOMReferences() {
        if (!this.parent)
            return;
        const rows = this.parent.querySelectorAll("[id^='draftee-card']");
        const dc = {};
        rows.forEach((row) => {
            const card = row;
            const playerLink = card.querySelector(`a[href^='/player/']`);
            const badge = card.querySelector(".badge"); // needed by addBadges later
            if (!playerLink || !badge)
                return;
            const playerId = playerLink.getAttribute("href")?.split("/").pop();
            if (playerId) {
                dc[playerId] = card;
            }
        });
        this.draftCards = dc;
    }
    attachEventListeners() {
        if (!this.parent)
            return;
        const toggleButton = document.querySelectorAll(`.btn-toggle`)[1];
        if (toggleButton) {
            this.toggleButtonListener = () => {
                this.initializeDOMReferences();
                this.addBadges();
            };
            toggleButton.addEventListener("click", this.toggleButtonListener);
        }
        this.paginationButtonListeners.clear(); // clear map before adding
        const buttons = Array.from(this.parent.querySelectorAll("button")).filter((btn) => {
            const hasMatchingSpan = Array.from(btn.querySelectorAll("span")).some((span) => /^(1|21|41|61|81)-\d+$/.test(span.textContent?.trim() ?? ""));
            const buttonText = Array.from(btn.childNodes)
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent?.trim())
                .join("");
            const hasMatchingDirectText = /^(1|21|41|61|81)-\d+$/.test(buttonText);
            return hasMatchingSpan || hasMatchingDirectText;
        });
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
                    const hasRelevantChanges = mutations.some((mutation) => mutation.addedNodes.length > 0 &&
                        Array.from(mutation.addedNodes).some((node) => node.nodeType === Node.ELEMENT_NODE &&
                            node.querySelector('[id^="draftee-card"]')));
                    if (hasRelevantChanges) {
                        this.initializeDOMReferences();
                        this.addBadges();
                        this.disconnectObserver();
                    }
                });
                this.mutationObserver.observe(this.parent, {
                    childList: true,
                    subtree: true,
                });
                if (this.observerTimeoutId)
                    clearTimeout(this.observerTimeoutId);
                this.observerTimeoutId = window.setTimeout(() => {
                    this.disconnectObserver();
                }, 3000); // 3 seconds
            };
            menu.addEventListener("change", listener);
            this.selectMenuListeners.set(menu, listener);
        });
    }
    disconnectObserver() {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
        if (this.observerTimeoutId) {
            clearTimeout(this.observerTimeoutId);
            this.observerTimeoutId = null;
        }
    }
    addBadges() {
        // Adds Min/Max badges to draft cards
        if (!this.draftCards || !this.draftClass)
            return;
        Object.entries(this.draftCards).forEach(([playerId, card]) => {
            // //safety
            if (card.getAttribute("data-ovr-badges-added") === "true")
                return;
            const badgeContainer = card.querySelector(`.badge`)?.parentElement;
            if (!badgeContainer)
                return;
            const player = this.draftClass.getPlayer(playerId); // draftClass checked above
            if (!player)
                return;
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
    createOvrLabelSpan(text) {
        const label = document.createElement("span");
        // add a class to make it easier to remove later
        label.classList.add("dynamic-ovr-label", "uppercase", "ml-3", "xs:inline-block", "hidden");
        label.innerText = text;
        return label;
    }
    createRatingSpan(ovr) {
        const ratingSpan = document.createElement("span");
        // add a class to make it easier to remove later
        ratingSpan.classList.add("dynamic-ovr-badge", "badge", "ml-1");
        ratingSpan.style.userSelect = "none";
        if (window.userData &&
            typeof window.userData.getColorPair === "function" &&
            ovr > 0) {
            try {
                const [bgColor, color] = window.userData.getColorPair(ovr);
                ratingSpan.style.backgroundColor = bgColor;
                ratingSpan.style.color = color;
            }
            catch (e) {
                console.error("Error getting color pair for OVR:", ovr, e);
            }
        }
        ratingSpan.innerText = ovr > 0 ? ovr.toString() : "?"; // Show ? if OVR is 0, shouldn't ever be needed
        return ratingSpan;
    }
}
const draftVisualizerInstance = new DraftClassVisualizer();
function handleDraftClassData(data) {
    const rosterData = { ...data, players: data.draftees };
    const newRoster = new _roster__WEBPACK_IMPORTED_MODULE_0__.Roster(rosterData);
    draftVisualizerInstance.updateData(newRoster);
}
function manipulateDraftClassPage(el) {
    draftVisualizerInstance.attach(el);
}


/***/ }),

/***/ "./src/pages/draft-ranking.ts":
/*!************************************!*\
  !*** ./src/pages/draft-ranking.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   handleDraftPickData: () => (/* binding */ handleDraftPickData),
/* harmony export */   handleDraftRankingData: () => (/* binding */ handleDraftRankingData),
/* harmony export */   manipulateDraftRankingPage: () => (/* binding */ manipulateDraftRankingPage)
/* harmony export */ });
/* harmony import */ var _roster__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./roster */ "./src/pages/roster.ts");

const DR_HIGHLIGHT_CLASS = "draft-ranking-highlight";
const DR_GHOST_TRIM = "draft-ranking-ghost-trim";
const DR_GHOST = "draft-ranking-ghost";
class DraftRankingVisualizer {
    parent = null;
    draftRanking = null;
    draftCards = null;
    ovrTab = null;
    tableHR = null;
    picks = null;
    tbody = null;
    dragStartListener = null;
    dragEndListener = null;
    highlightMutationObserver = null;
    highlightObserverTimeoutId = null;
    highlightLast = false;
    rowMutationObserver = null;
    constructor() { }
    attach(el) {
        this.detach();
        this.parent = el;
        if (this.parent && this.draftRanking) {
            this.initializeTableReferences();
            this.attachEventListeners();
            this.attachRowObserver();
            this.renderColumns();
            this.applyColumnHighlights();
        }
        else {
            this.detach();
        }
    }
    detach() {
        if (!this.parent)
            return;
        if (this.tbody) {
            if (this.dragStartListener)
                this.tbody.removeEventListener("dragstart", this.dragStartListener);
            if (this.dragEndListener)
                this.tbody.removeEventListener("dragend", this.dragEndListener);
        }
        if (this.rowMutationObserver)
            this.rowMutationObserver.disconnect();
        // this.disconnectHighlightObserver();
        this.parent = null;
        this.draftCards = null;
        this.ovrTab = null;
        this.tableHR = null;
        this.tbody = null;
    }
    updateRanking(newRanking) {
        this.draftRanking = newRanking;
        if (this.parent && this.draftRanking) {
            this.initializeTableReferences();
            this.renderColumns();
            this.applyColumnHighlights();
        }
    }
    updatePicks(picks) {
        this.picks = picks;
    }
    initializeTableReferences() {
        if (!this.parent)
            return;
        this.tbody = this.parent.querySelector(`table`);
        this.tableHR = this.parent.querySelector(`table thead tr`);
        if (!this.tbody || !this.tableHR)
            return;
        this.ovrTab =
            Array.from(this.tableHR.querySelectorAll(`th span`)).filter((span) => span.textContent?.trim() === "OVR")?.[0]?.parentElement ?? null;
        this.draftCards = {}; // reset reference
        const rows = this.tbody.querySelectorAll(`table tbody tr`);
        rows.forEach((row) => {
            const tableRow = row;
            const playerLink = tableRow.querySelectorAll(`a`)[1];
            const href = playerLink?.getAttribute("href");
            if (href) {
                const playerId = href.split("/").pop() || "";
                if (playerId) {
                    this.draftCards[playerId] = tableRow;
                }
            }
        });
    }
    attachEventListeners() {
        if (!this.parent || !this.tbody)
            return;
        // only do this if its in the picks
        this.dragStartListener = (event) => {
            const row = event.target;
            this.highlightLast = this.picks?.includes(row.rowIndex) ?? false;
            Array.from(row.children).forEach((el) => {
                el.classList.remove(DR_HIGHLIGHT_CLASS);
                if (el.hasAttribute("data-column"))
                    el.classList.add(this.highlightLast ? DR_GHOST_TRIM : DR_GHOST);
            });
        };
        // needs to improve logic to when elements doesn't update a pick
        this.dragEndListener = (event) => {
            const row = event.target;
            Array.from(row.children).forEach((el) => {
                if (el.hasAttribute("data-column")) {
                    if (this.highlightLast)
                        el.classList.add(DR_HIGHLIGHT_CLASS);
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
    disconnectHighlightObserver() {
        if (this.highlightMutationObserver) {
            this.highlightMutationObserver.disconnect();
            this.highlightMutationObserver = null;
        }
        if (this.highlightObserverTimeoutId) {
            clearTimeout(this.highlightObserverTimeoutId);
            this.highlightObserverTimeoutId = null;
        }
    }
    attachRowObserver() {
        if (!this.tableHR)
            return;
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
    removeColumns() {
        if (!this.parent)
            return;
        this.parent
            .querySelectorAll(`[data-column]`)
            .forEach((node) => node.remove());
    }
    renderColumns() {
        if (!this.parent ||
            !this.draftRanking ||
            !this.tableHR ||
            !this.ovrTab ||
            !this.draftCards) {
            return;
        }
        // remove previously added columns and their headers
        this.removeColumns();
        const tabElement = this.ovrTab;
        const headerRow = tabElement.parentElement;
        if (!headerRow)
            return;
        const ovrIdx = Array.from(headerRow.children).indexOf(tabElement);
        const minHeader = this.createOvrLabelSpan("MIN");
        const maxHeader = this.createOvrLabelSpan("MAX");
        this.tableHR.insertBefore(maxHeader, this.ovrTab.nextSibling);
        this.tableHR.insertBefore(minHeader, this.ovrTab.nextSibling);
        Object.entries(this.draftCards).forEach(([playerId, row]) => {
            const player = this.draftRanking.getPlayer(playerId);
            if (!player)
                return;
            const minDataCell = document.createElement("td");
            minDataCell.className = "px-4 text-center";
            minDataCell.dataset.column = "min-ovr";
            const maxDataCell = document.createElement("td");
            maxDataCell.className = "px-4 text-center";
            maxDataCell.dataset.column = "max-ovr";
            minDataCell.appendChild(this.createRatingSpan(player.getMinOvr(), player.getIsScout()));
            maxDataCell.appendChild(this.createRatingSpan(player.getMaxOvr(), player.getIsScout()));
            row.insertBefore(maxDataCell, row.children[ovrIdx].nextSibling);
            row.insertBefore(minDataCell, row.children[ovrIdx].nextSibling);
        });
    }
    applyColumnHighlights() {
        if (!this.parent || !this.picks)
            return;
        this.parent.querySelectorAll(`[data-column]`).forEach((node) => {
            node.classList.remove(DR_HIGHLIGHT_CLASS);
            if (this.picks?.includes(node.parentElement?.rowIndex))
                node.classList.add(DR_HIGHLIGHT_CLASS);
        });
    }
    createOvrLabelSpan(text) {
        const header = document.createElement("th");
        header.classList.add("px-4", "py-2");
        header.dataset.column = `${text.toLowerCase()}-ovr`;
        header.innerHTML = `<span>${text}</span>`;
        return header;
    }
    // modify to include empty fields
    createRatingSpan(ovr, scout) {
        const ratingSpan = document.createElement("span");
        if (scout && (!ovr || ovr <= 0)) {
            ratingSpan.innerText = "-";
            ratingSpan.style.color = "#555456";
            ratingSpan.style.textAlign = "center";
        }
        else {
            ratingSpan.classList.add("badge");
            ratingSpan.style.userSelect = "none";
            ratingSpan.innerText = ovr.toString();
            if (window.userData &&
                typeof window.userData.getColorPair === "function") {
                try {
                    const [bgColor, color] = window.userData.getColorPair(ovr);
                    ratingSpan.style.backgroundColor = bgColor;
                    ratingSpan.style.color = color;
                }
                catch (e) {
                    console.error("Error getting color pair for OVR:", ovr, e);
                }
            }
        }
        return ratingSpan;
    }
}
const drVisualizerInstance = new DraftRankingVisualizer();
function handleDraftRankingData(data) {
    const newDraftRanking = new _roster__WEBPACK_IMPORTED_MODULE_0__.Roster({ players: data });
    drVisualizerInstance.updateRanking(newDraftRanking);
}
function handleDraftPickData(data) {
    const picks = data.map((pick) => pick.rank);
    drVisualizerInstance.updatePicks(picks);
}
function manipulateDraftRankingPage(el) {
    drVisualizerInstance.attach(el);
}


/***/ }),

/***/ "./src/pages/player.ts":
/*!*****************************!*\
  !*** ./src/pages/player.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Player: () => (/* binding */ Player),
/* harmony export */   handlePlayerData: () => (/* binding */ handlePlayerData),
/* harmony export */   manipulatePlayerPage: () => (/* binding */ manipulatePlayerPage)
/* harmony export */ });
/* harmony import */ var _mappings_skill_mappings__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../mappings/skill-mappings */ "./src/mappings/skill-mappings.ts");

class Player {
    stats;
    minStats;
    maxStats;
    isScout;
    ovr;
    minOvr;
    maxOvr;
    constructor(data) {
        const player = this.parsePlayerData(data);
        this.stats = player.stats;
        this.isScout = player.scout;
        this.minStats = this.calcMinStats(this.stats);
        this.maxStats = this.calcMaxStats(this.stats);
        this.ovr = data?.rating ?? 0;
        this.minOvr = this.calculateOVR(this.minStats);
        this.maxOvr = this.calculateOVR(this.maxStats);
    }
    parsePlayerData(data) {
        const player = {};
        player.stats = {};
        player.scout = data.skills.every((skill) => skill?.hidden ?? false);
        for (const s of data.skills) {
            player.stats[s.id] = {
                rating: parseInt(s?.lvl ?? 0),
                max: s?.max ?? false,
                strength: null, // default, change below
            };
        }
        if (data?.talents?.weakest) {
            // if weakness exists so does strength
            player.stats[data.talents.weakest].strength = "weakest";
            data.talents.strongest.forEach((str) => (player.stats[str].strength =
                "strongest"));
        }
        return player;
    }
    calcMinStats(stats) {
        const minStats = structuredClone(stats);
        let weakestRating = 10;
        let highestNonStrongestRating = 0;
        // update ratings and find the highest non-strongest rating
        for (const stat of Object.values(minStats)) {
            stat.rating = stat.max ? stat.rating : stat.rating + 1;
            if (stat.strength !== "strongest") {
                highestNonStrongestRating = Math.max(highestNonStrongestRating, stat.rating);
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
            if (stat.strength === "strongest" &&
                stat.rating < highestNonStrongestRating) {
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
    calcMaxStats(stats) {
        const maxStats = structuredClone(stats);
        let strongestRating = 10;
        let lowestNonWeakestRating = 10;
        // find the strongest rating
        for (const stat of Object.values(maxStats)) {
            if (stat.strength === "strongest") {
                strongestRating = Math.min(strongestRating, stat.max ? stat.rating : 10);
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
    getStats() {
        return this.stats;
    }
    getMinStats() {
        return this.minStats;
    }
    getMaxStats() {
        return this.maxStats;
    }
    getIsScout() {
        return this.isScout;
    }
    getOvr() {
        return this.ovr;
    }
    getMaxOvr() {
        return Math.max(this.maxOvr, this.ovr); // handles cases where ovr is known through scouting, but stats are unknown
    }
    getMinOvr() {
        return Math.max(this.minOvr, this.ovr);
    }
    calculateOVR(stats) {
        if (this.isScout)
            return 0;
        const statsValues = Object.values(stats);
        const sum = statsValues.reduce((acc, stat) => acc + stat.rating, 0);
        const avg = sum / statsValues.length;
        const excess = statsValues.reduce((acc, stat) => stat.rating > avg ? acc + stat.rating - avg : acc, 0);
        const correctedSum = sum + excess;
        const correctedAverage = correctedSum / statsValues.length;
        return Math.round(correctedAverage * 10);
    }
}
class PlayerStatsVisualizer {
    playerStats = null;
    parent = null;
    ovrElement = null;
    statsTable = null;
    statsRows = null;
    skillsHeaderDiv = null;
    dropdownElement = null;
    dropdownListener = null; // store listeners
    constructor() { }
    attach(el) {
        this.detach(); // clean up previous state first
        if (!this.playerStats)
            return;
        this.parent = el;
        if (!this.initializeDOMReferences()) {
            this.detach(); // clean up if initialization failed
            return;
        }
        this.attachUIAndListeners();
        this.updateHockeyPucks("Default");
    }
    detach() {
        if (!this.parent)
            return;
        if (this.dropdownElement && this.dropdownListener) {
            this.dropdownElement.removeEventListener("change", this.dropdownListener);
        }
        if (this.dropdownElement && this.dropdownElement.parentNode) {
            this.dropdownElement.parentNode.removeChild(this.dropdownElement);
        }
        this.parent = null;
        this.ovrElement = null;
        this.statsTable = null;
        this.statsRows = null;
        this.skillsHeaderDiv = null;
        this.dropdownElement = null;
        this.dropdownListener = null;
    }
    initializeDOMReferences() {
        if (!this.parent)
            return false;
        this.ovrElement = this.parent.querySelector(".polygon text");
        const puck = this.parent.querySelector("svg.fa-hockey-puck");
        this.statsTable = puck
            ? puck.closest(`tbody`)
            : null;
        if (this.statsTable) {
            this.statsRows =
                this.statsTable.querySelectorAll("tr");
            if (!this.statsRows || this.statsRows.length === 0) {
                return false; // critical
            }
        }
        const headers = Array.from(this.parent.querySelectorAll(".card-header"));
        this.skillsHeaderDiv = headers.find((d) => d?.textContent?.trim() === "Skills");
        return !!(this.ovrElement || this.statsTable);
    }
    updatePlayer(player) {
        this.playerStats = player;
    }
    attachUIAndListeners() {
        if (!this.skillsHeaderDiv)
            return;
        if (this.skillsHeaderDiv.querySelector(".stats-dropdown-player"))
            return; // safety
        this.dropdownElement = document.createElement("select");
        this.dropdownElement.classList.add("stats-dropdown-player");
        this.dropdownElement.style.marginLeft = "auto";
        this.dropdownElement.style.fontSize = "12px";
        this.dropdownElement.style.padding = "2px";
        this.dropdownElement.style.border = "none";
        this.dropdownElement.style.backgroundColor = "#fff";
        this.dropdownElement.style.color = "#000";
        this.dropdownElement.style.width = "85px";
        this.dropdownElement.style.height = "18px";
        this.dropdownElement.style.lineHeight = "18px";
        this.dropdownElement.style.paddingTop = "0px";
        this.dropdownElement.style.paddingBottom = "0px";
        this.dropdownElement.style.paddingRight = "21px";
        this.dropdownElement.style.borderRadius = "2px";
        // store the listener function
        this.dropdownListener = (event) => {
            const selectElement = event.target;
            const selectedOption = selectElement.value;
            this.updateHockeyPucks(selectedOption);
        };
        this.dropdownElement.addEventListener("change", this.dropdownListener);
        const options = ["Default", "Min", "Max"];
        options.forEach((option) => {
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.textContent = option;
            optionElement.style.textAlign = "center";
            this.dropdownElement.appendChild(optionElement);
        });
        this.skillsHeaderDiv.appendChild(this.dropdownElement);
    }
    updateHockeyPucks(option) {
        if (!this.statsRows || !this.playerStats)
            return;
        const statsToUse = option === "Min"
            ? this.playerStats.getMinStats()
            : option === "Max"
                ? this.playerStats.getMaxStats()
                : this.playerStats.getStats();
        if (!statsToUse)
            return;
        this.statsRows.forEach((row) => {
            const skillNameText = row.cells[0]?.textContent?.trim();
            if (!skillNameText)
                return;
            const statName = _mappings_skill_mappings__WEBPACK_IMPORTED_MODULE_0__.SKILL_NAME_TO_ID[skillNameText];
            if (!statName)
                return;
            const pucksCell = row.cells[1];
            const ratingCell = row.cells[2];
            if (!pucksCell || !ratingCell)
                return;
            const pucks = pucksCell.querySelectorAll("svg.fa-hockey-puck");
            const ratingSpan = ratingCell.querySelector("span");
            // need base stats for comparison
            const baseStats = this.playerStats.getStats(); // playerStats is checked above
            const baseStat = baseStats ? baseStats[statName] : null;
            const displayStat = statsToUse[statName];
            if (baseStat && displayStat && pucks.length > 0) {
                pucks.forEach((puck, index) => {
                    puck.classList.remove("text-blue-400");
                    if (index < displayStat.rating) {
                        puck.classList.remove("text-gray-300");
                        if (index >= baseStat.rating) {
                            puck.classList.add("text-blue-400");
                        }
                    }
                    else {
                        puck.classList.add("text-gray-300");
                    }
                    if (index === displayStat.rating - 1 && baseStat.max) {
                        puck.classList.add("max-level");
                    }
                    else {
                        puck.classList.remove("max-level");
                    }
                });
                if (ratingSpan) {
                    ratingSpan.textContent = `(${displayStat.rating})`;
                }
            }
        });
        if (!this.playerStats)
            return;
        const ovr = option === "Min"
            ? this.playerStats.getMinOvr()
            : option === "Max"
                ? this.playerStats.getMaxOvr()
                : this.playerStats.getOvr();
        // confirm scout logic later
        let ovrToShow = ovr;
        if (option === "Default" &&
            this.playerStats.getIsScout() &&
            this.playerStats.getOvr() > 0) {
            ovrToShow = this.playerStats.getOvr();
        }
        // only update if we have a valid number (Min/Max calc returns 0 for scouts)
        // or if it's default view for a scout with known OVR
        if (ovrToShow > 0 ||
            (option === "Default" &&
                this.playerStats.getIsScout() &&
                this.playerStats.getOvr() > 0)) {
            this.updateOVR(ovrToShow);
        }
        else if (option !== "Default" && this.playerStats.getIsScout()) {
            // Handle displaying Min/Max for a scout where calculation is 0
            this.updateOVR(this.playerStats.getOvr()); // show default OVR as fallback?
        }
        else {
            // fallback to default OVR if other conditions aren't met
            this.updateOVR(this.playerStats.getOvr());
        }
    }
    updateOVR(ovr) {
        if (!this.ovrElement)
            return;
        this.ovrElement.textContent = ovr > 0 ? ovr.toString() : "?"; // Show ? if OVR is 0, though in practice this should never happen
        const polygonElement = this.ovrElement.parentElement?.querySelector("polygon");
        if (polygonElement && ovr > 0) {
            // only color if OVR > 0
            if (window.userData &&
                typeof window.userData.getColorPair === "function") {
                try {
                    const [bgColor, color] = window.userData.getColorPair(ovr);
                    polygonElement.setAttribute("fill", bgColor);
                    this.ovrElement.setAttribute("fill", color);
                }
                catch (e) {
                    console.error("Failed to get color pair for OVR:", ovr, e);
                }
            }
        }
    }
}
const playerVisualizerInstance = new PlayerStatsVisualizer();
function handlePlayerData(data) {
    const player = new Player(data);
    playerVisualizerInstance.updatePlayer(player);
}
function manipulatePlayerPage(el) {
    playerVisualizerInstance.attach(el);
}


/***/ }),

/***/ "./src/pages/roster.ts":
/*!*****************************!*\
  !*** ./src/pages/roster.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Roster: () => (/* binding */ Roster),
/* harmony export */   handleRosterData: () => (/* binding */ handleRosterData),
/* harmony export */   manipulateRosterPage: () => (/* binding */ manipulateRosterPage)
/* harmony export */ });
/* harmony import */ var _player__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./player */ "./src/pages/player.ts");

class Roster {
    players;
    constructor(data) {
        this.players = this.parseRosterData(data);
    }
    parseRosterData(data) {
        const roster = {};
        for (const p of data.players) {
            roster[p.id] = new _player__WEBPACK_IMPORTED_MODULE_0__.Player(p);
        }
        return roster;
    }
    getPlayer(playerId) {
        return this.players[playerId];
    }
    getAllPlayers() {
        return this.players;
    }
}
class RosterStatsVisualizer {
    roster = null;
    parent = null;
    header = null;
    footer = null;
    dataRows = null;
    tbody = null;
    onGeneralPage = true;
    minHeaderCell = null;
    maxHeaderCell = null;
    sortColumn = null;
    sortAscending = true;
    // store bound listeners for easier removal
    generalButtonClickListener = null;
    skillsButtonClickListener = null;
    selectChangeListener = null;
    headerClickListeners = new Map();
    constructor() { }
    attach(el) {
        this.detach();
        this.parent = el;
        if (this.parent && this.roster) {
            this.initializeVisualizerState();
            this.initializeTableReferences();
            this.attachEventListeners();
            this.renderColumns();
            // if (this.sortColumn) this.sortRows();
        }
        else {
            // cleanup if attachment is incomplete
            this.detach();
        }
    }
    detach() {
        if (!this.parent)
            return;
        const tabButtons = this.parent.querySelectorAll(`.btn-toggle`);
        if (tabButtons.length >= 2) {
            const isGeneral = tabButtons[0]?.textContent?.trim() === "General";
            const generalButton = isGeneral ? tabButtons[0] : tabButtons[1];
            const skillsButton = isGeneral ? tabButtons[1] : tabButtons[0];
            if (this.generalButtonClickListener && generalButton)
                generalButton.removeEventListener("click", this.generalButtonClickListener);
            if (this.skillsButtonClickListener && skillsButton)
                skillsButton.removeEventListener("click", this.skillsButtonClickListener);
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
    updateRoster(newRoster) {
        this.roster = newRoster;
        if (this.parent && this.roster) {
            this.initializeTableReferences();
            this.renderColumns();
            // if (this.sortColumn) this.sortRows();
        }
    }
    initializeVisualizerState() {
        if (!this.parent)
            return;
        const tabButtons = this.parent.querySelectorAll(`.btn-toggle`);
        if (!tabButtons.length || tabButtons.length < 2) {
            this.onGeneralPage = true;
            return;
        }
        const isGeneral = tabButtons[0]?.textContent?.trim() === "General";
        const generalButton = isGeneral ? tabButtons[0] : tabButtons[1];
        this.onGeneralPage = generalButton?.classList.contains("active") ?? true;
    }
    initializeTableReferences() {
        if (!this.parent)
            return;
        this.header = this.parent.querySelector(`table thead tr`);
        this.footer = this.parent.querySelector(`table tfoot tr`);
        this.tbody = this.parent.querySelector("table tbody");
        this.dataRows = {}; // reset row references
        if (!this.tbody)
            return;
        const rows = this.tbody.querySelectorAll(`tr`);
        rows.forEach((row) => {
            const tableRow = row;
            const playerLink = tableRow.querySelector("a.player-link");
            const href = playerLink?.getAttribute("href");
            if (href) {
                const playerId = href.split("/").pop() || "";
                if (playerId) {
                    this.dataRows[playerId] = tableRow;
                }
            }
        });
    }
    attachEventListeners() {
        if (!this.parent)
            return;
        const tabButtons = this.parent.querySelectorAll(`.btn-toggle`);
        if (tabButtons.length === 2) {
            const isGeneral = tabButtons[0]?.textContent?.trim() === "General";
            const generalButton = isGeneral ? tabButtons[0] : tabButtons[1];
            const skillsButton = isGeneral ? tabButtons[1] : tabButtons[0];
            // store the bound function to remove it later
            this.generalButtonClickListener = () => {
                if (this.onGeneralPage)
                    return;
                this.onGeneralPage = true;
                // re-initialize references and render columns for the new state
                this.initializeTableReferences();
                this.renderColumns();
                // if (this.sortColumn) this.sortRows();
            };
            if (generalButton)
                generalButton.addEventListener("click", this.generalButtonClickListener);
            this.skillsButtonClickListener = () => {
                if (!this.onGeneralPage)
                    return;
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
        this.headerClickListeners.forEach((listener, th) => th.removeEventListener("click", listener));
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
    renderColumns() {
        if (!this.parent ||
            !this.roster ||
            !this.dataRows ||
            !this.header ||
            !this.footer) {
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
        if (!this.onGeneralPage)
            return;
        Object.entries(this.dataRows).forEach(([playerId, row]) => {
            const player = this.roster.getPlayer(playerId);
            if (!player)
                return;
            const minDataCell = document.createElement("td");
            minDataCell.className = "md:px-4 px-2 py-2 text-center";
            minDataCell.dataset.column = "min-ovr";
            minDataCell.appendChild(this.createRatingSpan(player.getMinOvr(), player.getIsScout()));
            const maxDataCell = document.createElement("td");
            maxDataCell.className = "md:px-4 px-2 py-2 text-center";
            maxDataCell.dataset.column = "max-ovr";
            maxDataCell.appendChild(this.createRatingSpan(player.getMaxOvr(), player.getIsScout()));
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
        minFooterCell.appendChild(this.createRatingSpan(this.getRosterAvgOvr("Min"), false));
        const maxFooterCell = document.createElement("td");
        maxFooterCell.className = "md:px-4 px-2 py-2 text-center";
        maxFooterCell.dataset.column = "max-ovr";
        maxFooterCell.appendChild(this.createRatingSpan(this.getRosterAvgOvr("Max"), false));
        this.footer.appendChild(minFooterCell);
        this.footer.appendChild(maxFooterCell);
    }
    getRosterAvgOvr(ovrType) {
        if (!this.roster)
            return 0;
        const playerOvr = {
            Default: (player) => player.getOvr(),
            Min: (player) => player.getMinOvr(),
            Max: (player) => player.getMaxOvr(),
        };
        const players = this.roster.getAllPlayers();
        if (!players)
            return 0;
        const values = Object.values(players)
            .filter((player) => player && (!player.getIsScout() || player.getOvr() > 0)) // ensure player exists & filter scouts without OVR
            .map((player) => playerOvr[ovrType](player));
        return values.length
            ? Math.round(values.reduce((sum, value, _, array) => sum + value / array.length, 0))
            : 0;
    }
    createRatingSpan(ovr, scout) {
        const ratingSpan = document.createElement("span");
        if (scout && (!ovr || ovr <= 0)) {
            // treat 0 OVR for scout same as unknown
            ratingSpan.classList.add("question-mark");
            ratingSpan.innerText = "?";
            ratingSpan.style.color = "#bcbabe";
            ratingSpan.style.textAlign = "center";
        }
        else {
            ratingSpan.classList.add("badge");
            ratingSpan.style.userSelect = "none";
            ratingSpan.innerText = ovr.toString();
            if (window.userData &&
                typeof window.userData.getColorPair === "function") {
                try {
                    const [bgColor, color] = window.userData.getColorPair(ovr);
                    ratingSpan.style.backgroundColor = bgColor;
                    ratingSpan.style.color = color;
                }
                catch (e) {
                    console.error("Error getting color pair for OVR:", ovr, e);
                }
            }
        }
        return ratingSpan;
    }
}
const rosterVisualizerInstance = new RosterStatsVisualizer();
function handleRosterData(data) {
    const newRoster = new Roster(data);
    // notify the visualizer instance about the new data
    rosterVisualizerInstance.updateRoster(newRoster);
}
function manipulateRosterPage(el) {
    rosterVisualizerInstance.attach(el);
}


/***/ }),

/***/ "./src/user.ts":
/*!*********************!*\
  !*** ./src/user.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   User: () => (/* binding */ User),
/* harmony export */   handleUserData: () => (/* binding */ handleUserData)
/* harmony export */ });
/*
This could be improved by also intercepting calls to settings api, and updating colors in the class as the user updates them
This is because the settings object isn't sent again after colors are updated, making class colors slightly outdated
Is resolved on a refresh though
*/
class User {
    "bg-color-rating-90plus" = "#383839";
    "bg-color-rating-85plus" = "#383839";
    "bg-color-rating-80plus" = "#383839";
    "bg-color-rating-75plus" = "#10b981";
    "bg-color-rating-70plus" = "#10b981";
    "bg-color-rating-65plus" = "#1995AD";
    "bg-color-rating-60plus" = "#1995AD";
    "bg-color-rating-55plus" = "#1995AD";
    "bg-color-rating-50plus" = "#ed8936";
    "bg-color-rating-45plus" = "#ed8936";
    "bg-color-rating-40plus" = "#ed8936";
    "bg-color-rating-40less" = "#f56565";
    "color-rating-90plus" = "#f8f8f9";
    "color-rating-85plus" = "#f8f8f9";
    "color-rating-80plus" = "#f8f8f9";
    "color-rating-75plus" = "#f8f8f9";
    "color-rating-70plus" = "#f8f8f9";
    "color-rating-65plus" = "#f8f8f9";
    "color-rating-60plus" = "#f8f8f9";
    "color-rating-55plus" = "#f8f8f9";
    "color-rating-50plus" = "#f8f8f9";
    "color-rating-45plus" = "#f8f8f9";
    "color-rating-40plus" = "#f8f8f9";
    "color-rating-40less" = "#f8f8f9";
    constructor(data) {
        data && data?.settings && this.loadFromConfig(data.settings);
    }
    loadFromConfig(config) {
        for (const { id, value } of config) {
            if (id in this) {
                this[id] = value;
            }
        }
    }
    getColorPair(rating) {
        const thresholds = [90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40];
        const matched = thresholds.find((t) => rating >= t);
        const suffix = matched !== undefined ? `${matched}plus` : "40less";
        const bgKey = `bg-color-rating-${suffix}`;
        const colorKey = `color-rating-${suffix}`;
        return [this[bgKey], this[colorKey]];
    }
}
function handleUserData(data) {
    window.userData = new User(data);
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!****************************!*\
  !*** ./src/interceptor.ts ***!
  \****************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _pages_player__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./pages/player */ "./src/pages/player.ts");
/* harmony import */ var _navigation_handler__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./navigation-handler */ "./src/navigation-handler.ts");
/* harmony import */ var _pages_roster__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./pages/roster */ "./src/pages/roster.ts");
/* harmony import */ var _user__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./user */ "./src/user.ts");
/* harmony import */ var _pages_draft_class__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./pages/draft-class */ "./src/pages/draft-class.ts");
/* harmony import */ var _pages_draft_ranking__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./pages/draft-ranking */ "./src/pages/draft-ranking.ts");






(function () {
    (0,_navigation_handler__WEBPACK_IMPORTED_MODULE_1__.initNavigationHandler)(); // Initialize Observer from script context
    window.userData = new _user__WEBPACK_IMPORTED_MODULE_3__.User(); // Initialize User Object with default settings, probably not needed but fixes some load inconsistencies
    const URL_HANDLERS = {
        player: {
            pattern: /\/api\/player\/[^\/]+$/,
            handler: (data) => {
                (0,_pages_player__WEBPACK_IMPORTED_MODULE_0__.handlePlayerData)(data.data);
            },
        },
        roster: {
            pattern: /\/api\/team\/[^\/]+\/roster/,
            handler: (data) => {
                (0,_pages_roster__WEBPACK_IMPORTED_MODULE_2__.handleRosterData)(data.data);
            },
        },
        draftClass: {
            pattern: /\/api\/league\/[^\/]+\/draft-class/,
            handler: (data) => {
                (0,_pages_draft_class__WEBPACK_IMPORTED_MODULE_4__.handleDraftClassData)(data.data);
            },
        },
        userInfo: {
            pattern: /\/api\/user$/,
            handler: (data) => {
                (0,_user__WEBPACK_IMPORTED_MODULE_3__.handleUserData)(data);
            },
        },
        draftRanking: {
            pattern: /\/api\/draft\/[^\/]+\/rankings/,
            handler: (data) => {
                (0,_pages_draft_ranking__WEBPACK_IMPORTED_MODULE_5__.handleDraftRankingData)(data.data);
            },
        },
        draftPicks: {
            pattern: /\/api\/draft\/[^\/]+\/picks/,
            handler: (data) => {
                (0,_pages_draft_ranking__WEBPACK_IMPORTED_MODULE_5__.handleDraftPickData)(data.data);
            },
        },
    };
    function findHandler(url) {
        for (const { pattern, handler } of Object.values(URL_HANDLERS)) {
            if (pattern.test(url))
                return handler;
        }
        return null;
    }
    class Interceptor extends XMLHttpRequest {
        interceptedUrl = null;
        // @ts-ignore
        open(method, url, ...rest) {
            this.interceptedUrl = url;
            // @ts-ignore
            super.open(method, url, ...rest);
        }
        send(...args) {
            const url = this.interceptedUrl ?? "";
            const handler = findHandler(this.interceptedUrl ?? "");
            if (handler) {
                const originalOnReadyState = this.onreadystatechange;
                this.onreadystatechange = function () {
                    if (this.readyState === 4 && this.status === 200) {
                        try {
                            const data = JSON.parse(this.responseText);
                            handler(data);
                        }
                        catch (e) {
                            // most likely a null response body
                        }
                    }
                    if (originalOnReadyState) {
                        // @ts-ignore
                        originalOnReadyState.apply(this, arguments);
                    }
                };
            }
            super.send(...args);
        }
    }
    window.XMLHttpRequest = Interceptor;
    // intercept fetch as well, although I don't think this is used
    const originalFetch = window.fetch;
    window.fetch = async function (resource, init) {
        // handle strings & request obj
        const url = typeof resource === "string"
            ? resource
            : resource instanceof Request
                ? resource.url
                : resource.toString();
        const response = await originalFetch.call(this, resource, init);
        const handler = url && findHandler(url);
        if (handler) {
            try {
                const clonedResponse = response.clone();
                const data = await clonedResponse.json();
                handler(data);
            }
            catch (e) {
                console.error("Error processing fetch response:", e);
            }
        }
        return response;
    };
})();

})();

/******/ })()
;
//# sourceMappingURL=interceptor.js.map