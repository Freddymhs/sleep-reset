export default defineBackground(() => {
  // Runs once when the extension is installed or updated
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install") {
      console.log("Extension installed");
    }
  });

  // Example: listen for messages from content scripts or popup
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "PING") {
      sendResponse({ type: "PONG" });
    }
    return true; // keep message channel open for async responses
  });
});
