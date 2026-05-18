/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!******************************!*\
  !*** ./src/contentScript.ts ***!
  \******************************/

(() => {
    const EXTENSION_STYLE_ID = `hockey-nation-ext-styles`;
    const DR_HIGHLIGHT_CLASS = "draft-ranking-highlight";
    const DR_GHOST_TRIM = "draft-ranking-ghost-trim";
    if (document.getElementById(EXTENSION_STYLE_ID)) {
        return;
    }
    const cssRules = `
      [data-column] {
        background-color: transparent;
      }

      tr.ghost [data-column] {
          background-color: var(--bg-orange-300);
        }

      .${DR_HIGHLIGHT_CLASS} {
        border-color: #6ee7b7;
        border-bottom-width: 1px;
        border-top-width: 1px;
        background-color: #d1fae5;
      }

      .${DR_GHOST_TRIM} {
        border-color: #6ee7b7;
        border-bottom-width: 1px;
        border-top-width: 1px;
        background-color: #fbd38d;
      }
    `;
    const styleElement = document.createElement("style");
    styleElement.id = EXTENSION_STYLE_ID;
    styleElement.textContent = cssRules;
    (document.head || document.documentElement).appendChild(styleElement);
})();

/******/ })()
;
//# sourceMappingURL=contentScript.js.map