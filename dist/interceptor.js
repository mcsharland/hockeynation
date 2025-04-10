/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/pages/player.ts":
/*!*****************************!*\
  !*** ./src/pages/player.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   handlePlayerData: () => (/* binding */ handlePlayerData)
/* harmony export */ });
function parsePlayerData(data) {
    const player = {};
    player.stats = {};
    player.scout = data.data.skills.some((skill) => skill?.hidden ?? false);
    for (const s of data.data.skills) {
        player.stats[s.id] = {
            rating: parseInt(s?.lvl ?? 0),
            max: s?.max ?? false,
            strength: null, // default, change below
        };
    }
    if (data.data?.talents?.weakest) {
        // if weakness exists so does strength
        player.stats[data.data.talents.weakest].strength = "weakest";
        data.data.talents.strongest.forEach((str) => (player.stats[str].strength = "strongest"));
    }
    return player;
}
function calcMinStats(stats) {
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
function calcMaxStats(stats) {
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
function insertDropdown(div) {
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
        // updateHockeyPucks(selectedOption);
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
function checkPageLoad() {
    const div = Array.from(document.querySelectorAll("div.card-header")).filter((d) => d?.textContent?.trim() === "Skills")?.[0];
    if (div) {
        insertDropdown(div);
        return;
    }
    requestAnimationFrame(checkPageLoad);
}
function handlePlayerData(data) {
    // I just naturally assumed that the player request would only be used on the player page...
    // This is probably true but this will be left in until I confirm or refactor the handler
    if (!window.location.href.startsWith("https://hockey-nation.com/player"))
        return;
    const player = parsePlayerData(data);
    const minStats = calcMinStats(player.stats);
    const maxStats = calcMaxStats(player.stats);
    requestAnimationFrame(checkPageLoad);
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
  !*** ./src/interceptor.js ***!
  \****************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _pages_player_ts__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./pages/player.ts */ "./src/pages/player.ts");


(function () {
  const URL_HANDLERS = {
    player: {
      pattern: /\/api\/player\/[^\/]+$/,
      handler: (data) => {
        (0,_pages_player_ts__WEBPACK_IMPORTED_MODULE_0__.handlePlayerData)(data);
      },
    },
    roster: {
      pattern: /\/api\/team\/[^\/]+\/roster/,
      handler: (data) => {
        console.log("Found roster data:", data);
      },
    },
  };

  function findHandler(url) {
    for (const { pattern, handler } of Object.values(URL_HANDLERS)) {
      if (pattern.test(url)) return handler;
    }
    return null;
  }

  // intercept XHR
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._interceptedUrl = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    let handler;
    if (this._interceptedUrl && (handler = findHandler(this._interceptedUrl))) {
      const originalOnReadyState = this.onreadystatechange;

      this.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
          try {
            const data = JSON.parse(this.responseText);
            handler(data);
          } catch (e) {
            console.error("Error parsing response:", e);
          }
        }

        if (originalOnReadyState) {
          originalOnReadyState.apply(this, arguments);
        }
      };
    }

    return originalSend.apply(this, args);
  };

  // intercept fetch as well, although I don't think this is used
  const originalFetch = window.fetch;
  window.fetch = async function (resource, init) {
    // handle strings & request obj
    const url = typeof resource === "string" ? resource : resource.url;
    const response = await originalFetch.apply(this, arguments);

    let handler;
    if (url && (handler = findHandler(url))) {
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        handler(data);
      } catch (e) {
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