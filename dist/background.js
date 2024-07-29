/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};
/*!***************************!*\
  !*** ./src/background.ts ***!
  \***************************/

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId === 0) {
        chrome.tabs.get(details.tabId, (tab) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }
            const currentUrl = tab.url;
            if (currentUrl &&
                currentUrl.startsWith("https://hockey-nation.com/player/")) {
                chrome.tabs
                    .sendMessage(details.tabId, { action: "parseStatsTable" })
                    .catch((error) => {
                    // This error will be extremely common so it is masked
                });
            }
            else if (currentUrl &&
                currentUrl.startsWith("https://hockey-nation.com/draft-ranking/")) {
                console.log("Draft ranking page detected");
                chrome.tabs
                    .sendMessage(details.tabId, { action: "parseDraftTable" })
                    .catch((error) => {
                    // This error will be extremely common so it is masked
                });
            }
        });
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