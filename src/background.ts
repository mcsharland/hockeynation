// chrome.webNavigation.onHistoryStateUpdated.addListener(
//   (details) => {
//     if (details.frameId === 0) {
//       if (details.url.startsWith("https://hockey-nation.com/player")) {
//         chrome.tabs
//           .sendMessage(details.tabId, { action: "parseStatsTable" })
//           .catch((error) => {
//             //This error will be extremely common so it is masked
//           });
//       }
//     }
//   },
//   {
//     url: [{ urlPrefix: "https://hockey-nation.com/player" }],
//   },
// );
//
