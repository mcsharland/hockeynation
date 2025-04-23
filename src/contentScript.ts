(function () {
  // inject the interceptor script
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("dist/interceptor.js");
  (document.head || document.documentElement).appendChild(script);
  // remove after load
  script.onload = function () {
    script.remove();
  };

  const EXTENSION_STYLE_ID = `hockey-nation-ext-styles`;
  const DR_HIGHLIGHT_CLASS = "draft-ranking-highlight";
  const DR_GHOST_TRIM = "draft-ranking-ghost-trim";
  const DR_GHOST = "draft-ranking-ghost";

  if (document.getElementById(EXTENSION_STYLE_ID)) {
    return;
  }

  const cssRules = `
      .${DR_HIGHLIGHT_CLASS} {
      border-color: #6ee7b7;
      border-bottom-width: 1px;
      border-top-width: 1px;
      background-color: #d1fae5
      }

      .${DR_GHOST_TRIM} {
      border-color: #6ee7b7;
      border-bottom-width: 1px;
      border-top-width: 1px;
      background-color: #fbd38d
      }

      .${DR_GHOST} {
      background-color: #fbd38d
      }

    `;

  const styleElement = document.createElement("style");
  styleElement.id = EXTENSION_STYLE_ID;
  styleElement.textContent = cssRules;
  (document.head || document.documentElement).appendChild(styleElement);
})();
