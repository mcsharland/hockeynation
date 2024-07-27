/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};
/*!***************************!*\
  !*** ./src/background.ts ***!
  \***************************/

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId === 0) {
        if (details.url.startsWith("https://hockey-nation.com/player")) {
            chrome.tabs
                .sendMessage(details.tabId, { action: "parseStatsTable" })
                .catch((error) => {
                //This error will be extremely common so it is masked
            });
        }
        else if (details.url.startsWith("https://hockey-nation.com/draft-ranking")) {
            chrome.tabs
                .sendMessage(details.tabId, { action: "parseDraftTable" })
                .catch((error) => {
                //This error will be extremely common so it is masked
            });
        }
    }
}, {
    url: [
        { urlPrefix: "https://hockey-nation.com/player/" },
        { urlPrefix: "https://hockey-nation.com/draft-ranking/" },
    ],
});

/******/ })()
;
//# sourceMappingURL=background.js.map