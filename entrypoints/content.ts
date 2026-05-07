export default defineContentScript({
  matches: ["*://*/*"], // runs on all pages — restrict as needed
  main() {
    console.log("Content script running on:", window.location.href);

    // Example: send a message to the background service worker
    browser.runtime.sendMessage({ type: "PING" }).then((response) => {
      console.log("Background responded:", response);
    });

    // Example: observe DOM changes
    const observer = new MutationObserver((_mutations) => {
      // React to page changes here
    });

    observer.observe(document.body, { childList: true, subtree: true });
  },
});
