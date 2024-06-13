chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    if (details.frameId === 0) {
      chrome.tabs
        .sendMessage(details.tabId, { action: "parseStatsTable" })
        .catch((error) => {
          //This error will be extremely common so it is masked
        });
    }
  },
  { url: [{ urlMatches: "https://hockey-nation.com/player/*" }] },
);
