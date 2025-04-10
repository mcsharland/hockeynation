/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};
/*!******************************!*\
  !*** ./src/contentScript.ts ***!
  \******************************/

// dist/contentScript.js
console.log("Content script loaded");
// Inject the interceptor script
const script = document.createElement("script");
script.src = chrome.runtime.getURL("dist/interceptor.js");
(document.head || document.documentElement).appendChild(script);
script.onload = function () {
    script.remove();
};

/******/ })()
;
//# sourceMappingURL=contentScript.js.map