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
const parseStatsTable = () => {
    const puck = document.querySelector("svg.fa-hockey-puck");
    if (!puck) {
        return false;
    }
    let ancestor = puck.parentElement;
    while (ancestor && !ancestor.matches("table[data-v-a81c915e]")) {
        ancestor = ancestor.parentElement;
    }
    const statsTable = ancestor;
    if (!statsTable) {
        return false;
    }
    const divs = document.querySelectorAll("div.card-header");
    const ovrElement = document.querySelector("div.polygon.select-none text");
    const baseOVR = ovrElement ? ovrElement.textContent : null;
    const updateOVR = (ovr) => {
        var _a;
        const ovrElement = document.querySelector("div.polygon.select-none text");
        if (ovrElement) {
            ovrElement.textContent = ovr.toString();
            const polygonElement = (_a = ovrElement.parentElement) === null || _a === void 0 ? void 0 : _a.querySelector("polygon");
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
    };
    const updateHockeyPucks = (option) => {
        statsRows.forEach((row) => {
            var _a, _b;
            const statName = ((_b = (_a = row.cells[0]) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || "";
            const pucksCell = row.cells[1];
            const pucks = pucksCell.querySelectorAll("svg.fa-hockey-puck");
            const ratingCell = row.cells[2];
            const ratingSpan = ratingCell === null || ratingCell === void 0 ? void 0 : ratingCell.querySelector("span");
            const stat = stats[statName];
            if (stat) {
                let rating = stat.rating;
                if (option === "Min") {
                    rating = minStats[statName].rating;
                }
                else if (option === "Max") {
                    rating = maxStats[statName].rating;
                }
                pucks.forEach((puck, index) => {
                    puck.classList.remove("text-blue-400");
                    if (index < rating) {
                        puck.classList.remove("text-gray-300");
                        if (index >= stat.rating) {
                            puck.classList.add("text-blue-400");
                        }
                    }
                    else {
                        puck.classList.add("text-gray-300");
                    }
                    if (index === rating - 1 && stat.hasRedPuck) {
                        puck.classList.add("max-level");
                    }
                    else {
                        puck.classList.remove("max-level");
                    }
                });
                // update the rating value in the span element
                if (ratingSpan) {
                    ratingSpan.textContent = `(${rating})`;
                }
            }
        });
        let ovr = calculateOVR(stats);
        if (option === "Min") {
            ovr = calculateOVR(minStats);
        }
        else if (option === "Max") {
            ovr = calculateOVR(maxStats);
        }
        if (option !== "Default" || !scoutPlayer) {
            updateOVR(ovr);
        }
        else {
            updateOVR(baseOVR !== null ? parseInt(baseOVR) : ovr);
        }
    };
    divs.forEach((div) => {
        if (div.textContent && div.textContent.trim() === "Skills") {
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
                updateHockeyPucks(selectedOption);
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
    });
    const statsRows = statsTable.querySelectorAll("tbody tr");
    if (!statsRows.length) {
        return false;
    }
    const stats = {};
    let scoutPlayer = false;
    statsRows.forEach((row) => {
        var _a, _b, _c, _d;
        const statName = ((_b = (_a = row.cells[0]) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || "";
        const pucks = row.querySelectorAll("svg.fa-hockey-puck");
        const ratingText = (_d = (_c = row.cells[row.cells.length - 1]) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.trim();
        const ratingMatch = ratingText ? ratingText.match(/\((\d+)\)/) : null;
        if (!scoutPlayer && !ratingMatch) {
            scoutPlayer = true;
        }
        const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 0;
        const hasRedPuck = Array.from(pucks).some((puck) => puck.classList.contains("max-level"));
        stats[statName] = {
            rating,
            hasRedPuck,
            strength: null,
        };
    });
    const talentContainer = document.querySelector("body");
    if (talentContainer) {
        const talentText = talentContainer.textContent || "";
        const strongestMatch = talentText.match(/Strongest talents of .+ are (\w+ and \w+)/);
        const weakestMatch = talentText.match(/weakest talent is (\w+)/);
        const strongestTalents = strongestMatch
            ? strongestMatch[1].split(" and ")
            : [];
        const weakestTalent = weakestMatch ? weakestMatch[1] : "";
        strongestTalents.forEach((talent) => {
            if (stats[talent]) {
                stats[talent].strength = "strongest";
            }
        });
        if (weakestTalent && stats[weakestTalent]) {
            stats[weakestTalent].strength = "weakest";
        }
    }
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
    updateHockeyPucks("Default");
    return true;
};
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "parseStatsTable") {
        if (!parseStatsTable()) {
            const interval = setInterval(() => {
                if (parseStatsTable()) {
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