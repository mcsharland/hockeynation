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
/* harmony import */ var _pages_player__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./pages/player */ "./src/pages/player.ts");


const PAGE_HANDLERS = {
    player: {
        url: "https://hockey-nation.com/player/",
        selector: "table[data-v-a81c915e]",
        handler: (table) => {
            (0,_pages_player__WEBPACK_IMPORTED_MODULE_1__.manipulatePlayerPage)(table);
        },
    },
    // roster: {
    //   url: "https://hockey-nation.com/club/roster/",
    //   selector: "", //TBD
    //   handler: (table) => {},
    // },
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
    constructor(data) {
        const player = this.parsePlayerData(data);
        this.stats = player.stats;
        this.isScout = player.scout;
        this.minStats = this.calcMinStats(this.stats);
        this.maxStats = this.calcMaxStats(this.stats);
    }
    parsePlayerData(data) {
        const player = {};
        player.stats = {};
        player.scout = data.skills.some((skill) => skill?.hidden ?? false);
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
    calculateOVR(stats) {
        const statsValues = Object.values(stats);
        const sum = statsValues.reduce((acc, stat) => acc + stat.rating, 0);
        const avg = sum / statsValues.length;
        const excess = statsValues.reduce((acc, stat) => stat.rating > avg ? acc + stat.rating - avg : acc, 0);
        const correctedSum = sum + excess;
        const correctedAverage = correctedSum / statsValues.length;
        return Math.round(correctedAverage * 10);
    }
}
class StatsVisualizer {
    playerStats;
    parentNode;
    ovrElement = null;
    baseOVR = null;
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
        let ancestor = puck.parentElement;
        while (ancestor && !ancestor.matches("table[data-v-a81c915e]")) {
            ancestor = ancestor.parentElement;
        }
        this.statsTable = ancestor;
        if (!this.statsTable) {
            return;
        }
        // get stats rows
        this.statsRows =
            this.statsTable.querySelectorAll("tbody tr");
        if (!this.statsRows.length) {
            return;
        }
        // get OVR element
        this.ovrElement = this.parentNode.querySelector("div.polygon.select-none text");
        this.baseOVR = this.ovrElement ? this.ovrElement.textContent : null;
        // add dropdown to skills header
        this.addDropdown();
        // initialize display
        this.updateHockeyPucks("Default");
    }
    // Consider not adding / disabling twhen all of a player's stats are maxed
    addDropdown() {
        const div = Array.from(document.querySelectorAll("div.card-header")).filter((d) => d?.textContent?.trim() === "Skills")?.[0];
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
            ? this.playerStats.minStats
            : option === "Max"
                ? this.playerStats.maxStats
                : this.playerStats.stats;
        this.statsRows.forEach((row) => {
            const statName = _mappings_skill_mappings__WEBPACK_IMPORTED_MODULE_0__.SKILL_NAME_TO_ID[row.cells[0]?.textContent?.trim() || ""];
            const pucksCell = row.cells[1];
            const pucks = pucksCell.querySelectorAll("svg.fa-hockey-puck");
            const ratingCell = row.cells[2];
            const ratingSpan = ratingCell?.querySelector("span");
            const baseStat = this.playerStats.stats[statName];
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
        let ovr = this.playerStats.calculateOVR(statsToUse);
        if (option !== "Default" || !this.playerStats.isScout) {
            this.updateOVR(ovr);
        }
        else if (this.baseOVR !== null) {
            this.updateOVR(parseInt(this.baseOVR));
        }
    }
    updateOVR(ovr) {
        if (!this.ovrElement)
            return;
        this.ovrElement.textContent = ovr.toString();
        const polygonElement = this.ovrElement.parentElement?.querySelector("polygon");
        if (polygonElement) {
            let fillColor = "";
            if (ovr <= 39) {
                fillColor = "#f56565";
            }
            else if (ovr >= 40 && ovr <= 54) {
                fillColor = "#ed8936";
            }
            else if (ovr >= 55 && ovr <= 69) {
                fillColor = "#1995AD";
            }
            else if (ovr >= 70 && ovr <= 79) {
                fillColor = "#10b981";
            }
            else if (ovr >= 80) {
                fillColor = "#383839";
            }
            polygonElement.setAttribute("fill", fillColor);
        }
    }
}
function handlePlayerData(data) {
    window.playerData = new Player(data);
    const event = new CustomEvent("playerDataReady");
    window.dispatchEvent(event);
}
function manipulatePlayerPage(table) {
    if (window.playerData) {
        new StatsVisualizer(window.playerData, table);
    }
    else {
        const handler = () => {
            new StatsVisualizer(window.playerData, table);
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
/* harmony export */   handleRosterData: () => (/* binding */ handleRosterData)
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
        console.log(roster);
        return roster;
    }
}
function handleRosterData(data) {
    window.rosterData = new Roster(data);
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



(function () {
    (0,_navigation_handler__WEBPACK_IMPORTED_MODULE_1__.initNavigationHandler)(); // Initialize Observer from script context
    const URL_HANDLERS = {
        player: {
            pattern: /\/api\/player\/[^\/]+$/,
            handler: (data) => {
                (0,_pages_player__WEBPACK_IMPORTED_MODULE_0__.handlePlayerData)(data);
            },
        },
        roster: {
            pattern: /\/api\/team\/[^\/]+\/roster/,
            handler: (data) => {
                (0,_pages_roster__WEBPACK_IMPORTED_MODULE_2__.handleRosterData)(data);
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
            const handler = findHandler(this.interceptedUrl ?? "");
            if (handler) {
                const originalOnReadyState = this.onreadystatechange;
                this.onreadystatechange = function () {
                    if (this.readyState === 4 && this.status === 200) {
                        try {
                            const { data } = JSON.parse(this.responseText);
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