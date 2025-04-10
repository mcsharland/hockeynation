import { handlePlayerData } from "./pages/player.ts";

(function () {
  const URL_HANDLERS = {
    player: {
      pattern: /\/api\/player\/[^\/]+$/,
      handler: (data) => {
        handlePlayerData(data);
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
