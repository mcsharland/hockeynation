import { handlePlayerData } from "./pages/player";
import { initNavigationHandler } from "./navigation-handler";

(function () {
  initNavigationHandler(); // Initialize Observer from script context

  const URL_HANDLERS = {
    player: {
      pattern: /\/api\/player\/[^\/]+$/,
      handler: (data: any) => {
        handlePlayerData(data);
      },
    },
    roster: {
      pattern: /\/api\/team\/[^\/]+\/roster/,
      handler: (data: any) => {
        console.log("Found roster data:", data);
      },
    },
  };

  function findHandler(url: string) {
    for (const { pattern, handler } of Object.values(URL_HANDLERS)) {
      if (pattern.test(url)) return handler;
    }
    return null;
  }

  class Interceptor extends XMLHttpRequest {
    private interceptedUrl: string | null = null;

    // @ts-ignore
    open(method, url, ...rest) {
      this.interceptedUrl = url;
      // @ts-ignore
      super.open(method, url, ...rest);
    }

    send(...args: any[]) {
      const handler: Function | null = findHandler(this.interceptedUrl ?? "");
      if (handler) {
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
  window.fetch = async function (
    resource: RequestInfo | URL,
    init?: RequestInit,
  ) {
    // handle strings & request obj
    const url =
      typeof resource === "string"
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
      } catch (e) {
        console.error("Error processing fetch response:", e);
      }
    }
    return response;
  };
})();
