// background.js
// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "HOCKEY_ROSTER_DATA") {
    console.log("Received hockey roster data in background script");

    // Store for later use
    chrome.storage.local.set({
      rosterData: message.data,
      interceptedAt: Date.now(),
      sourceUrl: message.url,
    });

    // You could also send a notification or update UI
  }
});

// You could also set up the initial injection from here
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "loading" &&
    tab?.url?.includes("hockey-nation.com")
  ) {
    // Ensure content script is injected
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });
  }
});
