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
/* harmony import */ var _pages_player__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./pages/player */ "./src/pages/player.ts");
/* harmony import */ var _pages_roster__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./pages/roster */ "./src/pages/roster.ts");




const PAGE_HANDLERS = {
    player: {
        url: "https://hockey-nation.com/player",
        selector: "table tbody tr",
        handler: (el) => {
            (0,_pages_player__WEBPACK_IMPORTED_MODULE_2__.manipulatePlayerPage)(el);
        },
    },
    roster: {
        url: "https://hockey-nation.com/club/roster",
        selector: "table tbody tr",
        handler: (el) => {
            (0,_pages_roster__WEBPACK_IMPORTED_MODULE_3__.manipulateRosterPage)(el);
        },
    },
    draftClass: {
        url: "https://hockey-nation.com/office/draft-center",
        selector: ".stats-container",
        handler: (el) => {
            (0,_pages_draft_class__WEBPACK_IMPORTED_MODULE_1__.manipulateDraftClassPage)(el);
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
    parent;
    draftClass;
    draftCards = null;
    constructor(draftClass, el) {
        this.draftClass = draftClass;
        this.parent = el;
        this.initialize();
        window.addEventListener("draftClassDataUpdated", () => {
            if (window.draftClassData) {
                this.draftClass = window.draftClassData;
            }
        });
    }
    initialize() {
        document
            .querySelectorAll(`.btn-toggle`)[1]
            .addEventListener("click", (event) => {
            this.initializeReferences();
        });
        this.initializeReferences();
        // select pagination buttons
        const buttons = Array.from(this.parent.querySelectorAll("button")).filter((btn) => {
            // select top buttons matching pattern
            const hasMatchingSpan = Array.from(btn.querySelectorAll("span")).some((span) => /^(1|21|41|61|81)-\d+$/.test(span.textContent?.trim() ?? ""));
            // select buttom buttons matching pattern because theyre different for some reason
            const buttonText = btn.childNodes.length > 0
                ? Array.from(btn.childNodes)
                    .filter((node) => node.nodeType === Node.TEXT_NODE)
                    .map((node) => node.textContent?.trim())
                    .join("")
                : "";
            const hasMatchingDirectText = /^(1|21|41|61|81)-\d+$/.test(buttonText);
            return hasMatchingSpan || hasMatchingDirectText;
        });
        buttons.forEach((button) => {
            button.addEventListener("click", (event) => {
                this.initializeReferences();
            });
        });
        this.parent.querySelectorAll("select").forEach((menu) => {
            menu.addEventListener("change", (event) => {
                const observer = new MutationObserver((mutations) => {
                    const hasRelevantChanges = mutations.some((mutation) => mutation.addedNodes.length > 0 &&
                        Array.from(mutation.addedNodes).some((node) => node.nodeType === Node.ELEMENT_NODE &&
                            node.querySelector('[id^="draftee-card"]')));
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
    initializeReferences() {
        const rows = this.parent.querySelectorAll("[id^='draftee-card']");
        const dc = {};
        rows.forEach((row) => {
            const card = row;
            const badge = row.querySelector(".badge");
            if (!badge)
                return;
            const playerId = row
                .querySelector(`a[href^='/player/']`)
                ?.getAttribute("href")
                ?.split("/")
                .pop();
            if (!playerId)
                return;
            dc[playerId] = card;
        });
        this.draftCards = dc;
        this.addBadges();
    }
    addBadges() {
        if (!this.draftCards)
            return;
        Object.entries(this.draftCards).forEach(([playerId, card]) => {
            if (card.getAttribute("data-ovr-badges-added") === "true")
                return;
            const badge = card.querySelector(`.badge`);
            if (!badge)
                return;
            const player = this.draftClass.getPlayer(playerId);
            if (!player)
                return;
            card.setAttribute("data-ovr-badges-added", "true");
            badge.parentElement?.insertBefore(this.createOvrLabelSpan("MIN"), null);
            badge.parentElement?.insertBefore(this.createRatingSpan(player.getMinOvr()), null);
            badge.parentElement?.insertBefore(this.createOvrLabelSpan("MAX"), null);
            badge.parentElement?.insertBefore(this.createRatingSpan(player.getMaxOvr()), null);
        });
    }
    createOvrLabelSpan(text) {
        const label = document.createElement("span");
        label.classList.add("uppercase", "ml-3", "xs:inline-block", "hidden");
        label.innerText = text;
        return label;
    }
    createRatingSpan(ovr) {
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
function handleDraftClassData(data) {
    const isUpdate = !!window.draftClassData; // check if this is an update
    window.draftClassData = new _roster__WEBPACK_IMPORTED_MODULE_0__.Roster({ ...data, players: data.draftees });
    const eventName = isUpdate ? "draftClassDataUpdated" : "draftClassDataReady";
    const event = new CustomEvent(eventName);
    window.dispatchEvent(event);
}
function manipulateDraftClassPage(el) {
    if (window.draftClassData) {
        new DraftClassVisualizer(window.draftClassData, el);
    }
    else {
        const handler = () => {
            new DraftClassVisualizer(window.draftClassData, el);
            window.removeEventListener("draftClassDataReady", handler);
        };
        window.addEventListener("draftClassDataReady", handler);
    }
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
    playerStats;
    parentNode;
    ovrElement = null;
    statsTable = null;
    statsRows = null;
    constructor(playerStats, parentNode) {
        this.playerStats = playerStats;
        this.parentNode = parentNode;
        this.initialize();
    }
    initialize() {
        const puck = this.parentNode.querySelector("svg.fa-hockey-puck");
        if (!puck) {
            return;
        }
        this.statsTable = puck.closest(`tbody`);
        if (!this.statsTable) {
            return;
        }
        // get stats rows
        this.statsRows =
            this.statsTable.querySelectorAll("tr");
        if (!this.statsRows.length) {
            return;
        }
        // get OVR element
        this.ovrElement =
            this.parentNode.querySelector(".polygon text");
        // add dropdown to skills header
        this.addDropdown();
        // initialize display
        this.updateHockeyPucks("Default");
    }
    // Consider not adding / disabling when all of a player's stats are maxed
    addDropdown() {
        const div = Array.from(document.querySelectorAll(".card-header")).filter((d) => d?.textContent?.trim() === "Skills")?.[0];
        if (div === undefined)
            return;
        if (div.querySelector(".stats-dropdown"))
            return;
        const dropdown = document.createElement("select");
        dropdown.classList.add("stats-dropdown");
        dropdown.style.marginLeft = "auto";
        dropdown.style.fontSize = "12px";
        dropdown.style.padding = "2px";
        dropdown.style.border = "none";
        dropdown.style.backgroundColor = "#fff";
        dropdown.style.color = "#000";
        dropdown.style.width = "85px";
        dropdown.style.height = "18px";
        dropdown.style.lineHeight = "18px";
        dropdown.style.paddingTop = "0px";
        dropdown.style.paddingBottom = "0px";
        dropdown.style.paddingRight = "21px";
        dropdown.style.borderRadius = "2px";
        dropdown.addEventListener("change", (event) => {
            const selectElement = event.target;
            const selectedOption = selectElement.value;
            this.updateHockeyPucks(selectedOption);
        });
        const options = ["Default", "Min", "Max"];
        options.forEach((option) => {
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.textContent = option;
            optionElement.style.textAlign = "center";
            dropdown.appendChild(optionElement);
        });
        div.appendChild(dropdown);
    }
    updateHockeyPucks(option) {
        if (!this.statsRows)
            return;
        const statsToUse = option === "Min"
            ? this.playerStats.getMinStats()
            : option === "Max"
                ? this.playerStats.getMaxStats()
                : this.playerStats.getStats();
        this.statsRows.forEach((row) => {
            const statName = _mappings_skill_mappings__WEBPACK_IMPORTED_MODULE_0__.SKILL_NAME_TO_ID[row.cells[0]?.textContent?.trim() || ""];
            const pucksCell = row.cells[1];
            const pucks = pucksCell.querySelectorAll("svg.fa-hockey-puck");
            const ratingCell = row.cells[2];
            const ratingSpan = ratingCell?.querySelector("span");
            const baseStat = this.playerStats.getStats()[statName];
            const displayStat = statsToUse[statName];
            if (baseStat && displayStat) {
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
                // update the rating value in the span element
                if (ratingSpan) {
                    ratingSpan.textContent = `(${displayStat.rating})`;
                }
            }
        });
        // update OVR
        const ovr = option === "Min"
            ? this.playerStats.getMinOvr()
            : option === "Max"
                ? this.playerStats.getMaxOvr()
                : this.playerStats.getOvr();
        if (option !== "Default" || !this.playerStats.getIsScout()) {
            this.updateOVR(ovr);
        }
        else if (this.playerStats.getOvr() !== 0) {
            this.updateOVR(this.playerStats.getOvr());
        }
    }
    updateOVR(ovr) {
        if (!this.ovrElement)
            return;
        this.ovrElement.textContent = ovr.toString();
        const polygonElement = this.ovrElement.parentElement?.querySelector("polygon");
        if (polygonElement) {
            if (window.userData) {
                polygonElement.setAttribute("fill", window.userData.getColorPair(ovr)[0]);
                this.ovrElement.setAttribute("fill", window.userData.getColorPair(ovr)[1]);
            }
        }
    }
}
function handlePlayerData(data) {
    window.playerData = new Player(data);
    const event = new CustomEvent("playerDataReady");
    window.dispatchEvent(event);
}
function manipulatePlayerPage(el) {
    if (window.playerData) {
        new PlayerStatsVisualizer(window.playerData, el);
    }
    else {
        const handler = () => {
            new PlayerStatsVisualizer(window.playerData, el);
            window.removeEventListener("playerDataReady", handler);
        };
        window.addEventListener("playerDataReady", handler);
    }
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
    roster;
    parent;
    header = null;
    footer = null;
    dataRows = null;
    generalButton = null;
    skillsButton = null;
    tbody = null;
    onGeneralPage = true;
    minHeaderCell = null;
    maxHeaderCell = null;
    selectElement = null;
    sortColumn = null;
    sortAscending = true;
    constructor(roster, parentNode) {
        this.roster = roster;
        this.parent = parentNode;
        this.initialize();
    }
    initialize() {
        const tabButtons = this.parent.querySelectorAll(`.btn-toggle`);
        if (!tabButtons.length)
            return;
        const isGeneral = tabButtons[0]?.textContent?.trim() === "General";
        this.generalButton = isGeneral ? tabButtons[0] : tabButtons[1];
        this.skillsButton = isGeneral ? tabButtons[1] : tabButtons[0];
        this.onGeneralPage = this.generalButton.classList.contains("active");
        // this.skillsButton =
        this.generalButton.addEventListener("click", (event) => {
            if (this.onGeneralPage)
                return;
            this.onGeneralPage = true;
            // re-initialize the table references since dom has changed
            this.initializeTableReferences();
            if (this.dataRows && Object.keys(this.dataRows).length > 0) {
                this.addNewColumns();
            }
            // if (this.sortColumn) this.sortRows()
        });
        this.skillsButton.addEventListener("click", (event) => {
            if (!this.onGeneralPage)
                return;
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
    initializeTableReferences() {
        // reset references to get the latest dom nodes
        this.header = this.parent.querySelector(`table thead tr`);
        this.footer = this.parent.querySelector(`table tfoot tr`);
        this.tbody = this.parent.querySelector("table tbody");
        const headerElements = this.header?.querySelectorAll(`th`);
        headerElements?.forEach((node) => node.addEventListener("click", () => {
            this.sortColumn = null;
            this.sortAscending = false;
        }));
        const rows = this.parent.querySelectorAll(`tbody tr`);
        const dr = {};
        rows.forEach((row) => {
            const tableRow = row;
            const playerLink = tableRow.querySelector("a.player-link");
            if (playerLink?.getAttribute("href")) {
                const playerId = playerLink.getAttribute("href").split("/").pop() || "";
                dr[playerId] = tableRow;
            }
        });
        this.dataRows = dr;
    }
    getRosterAvgOvr(ovrType) {
        const playerOvr = {
            Default: (player) => player.getOvr(),
            Min: (player) => player.getMinOvr(),
            Max: (player) => player.getMaxOvr(),
        };
        const players = this.roster.getAllPlayers();
        const values = Object.values(players)
            .filter((player) => !player.getIsScout() || player.getOvr())
            .map((player) => playerOvr[ovrType](player));
        return values.length
            ? Math.round(values.reduce((sum, value, _, array) => sum + value / array.length, 0))
            : 0;
    }
    createRatingSpan(ovr, scout) {
        const ratingSpan = document.createElement("span");
        if (scout && !ovr) {
            ratingSpan.classList.add("question-mark");
            ratingSpan.innerText = "?";
            ratingSpan.style.color = "#bcbabe";
        }
        else {
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
    addNewColumns() {
        if (!this.onGeneralPage || !this.dataRows || !this.header || !this.footer)
            return;
        // delete old columns
        this.parent
            .querySelectorAll(`[data-column]`)
            .forEach((node) => node.remove());
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
        minFooterCell.appendChild(this.createRatingSpan(this.getRosterAvgOvr("Min"), false));
        const maxFooterCell = document.createElement("td");
        maxFooterCell.className = "md:px-4 px-2 py-2";
        maxFooterCell.dataset.column = "max-ovr";
        maxFooterCell.appendChild(this.createRatingSpan(this.getRosterAvgOvr("Max"), false));
        this.footer.insertBefore(minFooterCell, null);
        this.footer.insertBefore(maxFooterCell, null);
        // this.addSorting();
    }
}
function handleRosterData(data) {
    window.rosterData = new Roster(data);
    const event = new CustomEvent("rosterDataReady");
    window.dispatchEvent(event);
}
function manipulateRosterPage(el) {
    if (window.rosterData) {
        new RosterStatsVisualizer(window.rosterData, el);
    }
    else {
        const handler = () => {
            new RosterStatsVisualizer(window.rosterData, el);
            window.removeEventListener("rosterDataReady", handler);
        };
        window.addEventListener("rosterDataReady", handler);
    }
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
                            console.error("Error parsing response:", e);
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