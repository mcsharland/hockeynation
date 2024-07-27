/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};
/*!******************************!*\
  !*** ./src/contentScript.ts ***!
  \******************************/

const calculateOVR = (stats) => {
    const statsValues = Object.keys(stats).map((key) => stats[key]);
    const sum = statsValues.reduce((acc, stat) => acc + stat.rating, 0);
    const avg = sum / statsValues.length;
    let excess = 0;
    for (const stat of statsValues) {
        if (stat.rating > avg) {
            excess += stat.rating - avg;
        }
    }
    const correctedSum = sum + excess;
    const correctedAverage = correctedSum / statsValues.length;
    const ovr = Math.round(correctedAverage * 10);
    return ovr;
};
const calculateMinStats = (stats) => {
    const minStats = JSON.parse(JSON.stringify(stats));
    let weakestRating = 10;
    let highestNonStrongestRating = 0;
    // find the weakest rating
    for (const key of Object.keys(minStats)) {
        const stat = minStats[key];
        if (stat.strength === "weakest") {
            weakestRating = stat.rating;
        }
    }
    // update ratings and find the highest non-strongest rating
    for (const key of Object.keys(minStats)) {
        const stat = minStats[key];
        minStats[key].rating = stat.hasRedPuck ? stat.rating : stat.rating + 1;
        if (stat.strength !== "strongest") {
            highestNonStrongestRating = Math.max(highestNonStrongestRating, minStats[key].rating);
        }
    }
    // adjust strongest stats
    for (const key of Object.keys(minStats)) {
        const stat = minStats[key];
        if (stat.strength === "strongest" &&
            stat.rating < highestNonStrongestRating) {
            minStats[key].rating = highestNonStrongestRating;
        }
    }
    // adjust weakest stats
    for (const key of Object.keys(minStats)) {
        if (minStats[key].rating < weakestRating) {
            minStats[key].rating = weakestRating;
        }
        if (minStats[key].rating < 4) {
            minStats[key].rating = 4;
        }
    }
    return minStats;
};
const calculateMaxStats = (stats) => {
    const maxStats = JSON.parse(JSON.stringify(stats));
    let strongestRating = 10;
    let lowestNonWeakestRating = 10;
    // find the strongest rating
    for (const key of Object.keys(maxStats)) {
        const stat = maxStats[key];
        if (stat.strength === "strongest") {
            strongestRating = Math.min(strongestRating, stat.hasRedPuck ? stat.rating : 10);
        }
    }
    // update ratings and find the lowest non-weakest rating
    for (const key of Object.keys(maxStats)) {
        const stat = maxStats[key];
        if (!stat.hasRedPuck && stat.rating < strongestRating) {
            maxStats[key].rating = strongestRating;
        }
        if (stat.strength !== "weakest") {
            lowestNonWeakestRating = Math.min(lowestNonWeakestRating, maxStats[key].rating);
        }
    }
    // adjust strongest stats
    for (const key of Object.keys(maxStats)) {
        const stat = maxStats[key];
        if (stat.strength === "strongest" && !stat.hasRedPuck && stat.rating < 10) {
            maxStats[key].rating = 10;
        }
    }
    // adjust weakest stats
    for (const key of Object.keys(maxStats)) {
        const stat = maxStats[key];
        if (stat.strength === "weakest" && stat.rating > lowestNonWeakestRating) {
            maxStats[key].rating = lowestNonWeakestRating;
        }
        if (maxStats[key].rating < 4) {
            maxStats[key].rating = 4;
        }
    }
    return maxStats;
};
const getStatsForPosition = (position) => {
    const firstPosition = position.split("/")[0];
    if (firstPosition === "G") {
        return ["REF", "END", "POS", "PAD", "GLO", "BLO", "STK"];
    }
    else if (firstPosition === "LD" || firstPosition === "RD") {
        return ["SKA", "END", "PWR", "SHO", "PAS", "DEF", "CHK", "DSC"];
    }
    else {
        return ["SKA", "END", "PWR", "SHO", "PAS", "DEF", "CHK", "DSC", "FOF"];
    }
};
const parseDraftTable = () => {
    const infoButton = document.querySelector('button:has(svg[data-icon="table-cells"])');
    if (!infoButton) {
        return false;
    }
    infoButton.click();
    let players = [];
    function findTargetGrid() {
        return document.querySelector(".grid.grid-cols-2.gap-x-2");
    }
    function findSelectAllLabel() {
        return document.querySelector('label[for="all"]');
    }
    function findUpdateButton() {
        return document.querySelector("button.btn.btn-blue.flex-grow");
    }
    function extractPlayers() {
        const rows = document.querySelectorAll("tbody[data-v-e2e20c3e] tr");
        players = Array.from(rows).map((row) => {
            var _a, _b, _c, _d, _e;
            const cells = row.querySelectorAll("td");
            const id = row.id;
            const nameElement = cells[1].querySelector("a.text-link-primary span.lg\\:inline-block");
            const name = nameElement ? ((_a = nameElement.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || "" : "";
            const positionElement = cells[1].querySelector("span.text-gray-600.tracking-tighter span");
            const position = positionElement
                ? ((_b = positionElement.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || ""
                : "";
            const ovrElement = cells[6].querySelector("span");
            let ovr = null;
            if (ovrElement) {
                const ovrText = (_c = ovrElement.textContent) === null || _c === void 0 ? void 0 : _c.trim();
                ovr = ovrText === "-" ? null : parseInt(ovrText || "0", 10);
            }
            const strengthsElement = cells[3].querySelector("span");
            const weaknessElement = cells[4].querySelector("span");
            const strengthsText = strengthsElement
                ? ((_d = strengthsElement.textContent) === null || _d === void 0 ? void 0 : _d.trim()) || ""
                : "";
            const weaknessText = weaknessElement
                ? ((_e = weaknessElement.textContent) === null || _e === void 0 ? void 0 : _e.trim()) || ""
                : "";
            const statMap = {
                Skating: "SKA",
                Endurance: "END",
                Power: "PWR",
                Shooting: "SHO",
                Passing: "PAS",
                Defending: "DEF",
                Checking: "CHK",
                Discipline: "DSC",
                Faceoffs: "FOF",
                Reflexes: "REF",
                Positioning: "POS",
                Pads: "PAD",
                Glove: "GLO",
                Blocker: "BLO",
                Stick: "STK",
            };
            const strengths = strengthsText
                .split("|")
                .map((s) => statMap[s.trim()])
                .filter(Boolean);
            const weakness = statMap[weaknessText.trim()] || "";
            const statsToTrack = getStatsForPosition(position);
            const stats = {};
            statsToTrack.forEach((stat) => {
                var _a;
                let cellIndex;
                switch (stat) {
                    case "SKA":
                        cellIndex = 18;
                        break;
                    case "END":
                        cellIndex = 19;
                        break;
                    case "PWR":
                        cellIndex = 20;
                        break;
                    case "SHO":
                        cellIndex = 21;
                        break;
                    case "PAS":
                        cellIndex = 22;
                        break;
                    case "DEF":
                        cellIndex = 23;
                        break;
                    case "CHK":
                        cellIndex = 24;
                        break;
                    case "DSC":
                        cellIndex = 25;
                        break;
                    case "FOF":
                        cellIndex = 26;
                        break;
                    case "REF":
                        cellIndex = 27;
                        break;
                    case "POS":
                        cellIndex = 28;
                        break;
                    case "PAD":
                        cellIndex = 29;
                        break;
                    case "GLO":
                        cellIndex = 30;
                        break;
                    case "BLO":
                        cellIndex = 31;
                        break;
                    case "STK":
                        cellIndex = 32;
                        break;
                    default:
                        cellIndex = -1;
                }
                if (cellIndex !== -1 && cellIndex < cells.length) {
                    const statElement = cells[cellIndex].querySelector("span");
                    if (statElement) {
                        const ratingText = ((_a = statElement.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || "";
                        const rating = ratingText === "-" ? 0 : parseInt(ratingText, 10);
                        const hasRedPuck = statElement.classList.contains("maxed");
                        stats[stat] = {
                            rating,
                            hasRedPuck,
                            strength: strengths.indexOf(stat) !== -1
                                ? "strongest"
                                : stat === weakness
                                    ? "weakest"
                                    : null,
                        };
                    }
                }
                if (!stats[stat]) {
                    stats[stat] = {
                        rating: 0,
                        hasRedPuck: false,
                        strength: null,
                    };
                }
            });
            const minStats = calculateMinStats(stats);
            const maxStats = calculateMaxStats(stats);
            return {
                id,
                name,
                position,
                ovr,
                minOvr: calculateOVR(minStats),
                maxOvr: calculateOVR(maxStats),
                stats,
            };
        });
        console.log("Extracted players:", players);
    }
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.type === "childList") {
                const targetGrid = findTargetGrid();
                if (targetGrid) {
                    observer.disconnect();
                    const selectAllLabel = findSelectAllLabel();
                    if (selectAllLabel) {
                        const checkbox = document.getElementById("all");
                        if (checkbox && !checkbox.checked) {
                            selectAllLabel.click();
                        }
                    }
                    const updateButton = findUpdateButton();
                    if (updateButton) {
                        updateButton.click();
                    }
                    // Extract players after updating
                    setTimeout(extractPlayers, 500); // Small delay to ensure table is updated
                    return;
                }
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return true;
};
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "parseDraftTable") {
        if (!parseDraftTable()) {
            const interval = setInterval(() => {
                if (parseDraftTable()) {
                    clearInterval(interval);
                }
            }, 100); // 0.1 Seconds
            setTimeout(() => {
                clearInterval(interval);
            }, 10000); // 10 Seconds
        }
    }
});

/******/ })()
;
//# sourceMappingURL=contentScript.js.map