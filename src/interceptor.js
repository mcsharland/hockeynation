(function () {
  // intercept XHR
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._interceptedUrl = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    if (
      this._interceptedUrl &&
      this._interceptedUrl.includes("/api/team/") &&
      this._interceptedUrl.includes("/roster")
    ) {
      const originalOnReadyState = this.onreadystatechange;

      this.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
          try {
            const data = JSON.parse(this.responseText);
            console.log("INTERCEPTED ROSTER DATA:", data);

            // Call data processing here
            // Maybe split if statements to become a routing table for different request processing
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

    // split in routing table
    if (url && url.includes("/api/team/") && url.includes("/roster")) {
      try {
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        console.log("INTERCEPTED ROSTER DATA (fetch):", data);
      } catch (e) {
        console.error("Error processing fetch response:", e);
      }
    }
    return response;
  };
})();
