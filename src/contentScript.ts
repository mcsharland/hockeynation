// inject the interceptor script
const script = document.createElement("script");
script.src = chrome.runtime.getURL("dist/interceptor.js");
(document.head || document.documentElement).appendChild(script);
// remove after load
script.onload = function () {
  script.remove();
};
