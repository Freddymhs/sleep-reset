import { STORAGE_KEYS } from "../src/lib/constants";

export default defineBackground(() => {
  // Runs once when the extension is installed or updated
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install") {
      console.log("Extension installed");
    }
  });

  // Listen for messages from content scripts or popup
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "PING") {
      sendResponse({ type: "PONG" });
      return true;
    }

    if (message.type === "AUTH_SIGN_OUT") {
      // Invalidate Supabase session from service worker context.
      // Background cannot use chrome.identity (popup-only), but it can
      // clear the stored session so the next popup open shows LoginScreen.
      browser.storage.local.remove(STORAGE_KEYS.SUPABASE_SESSION).then(() => {
        sendResponse({ type: "AUTH_SIGN_OUT_ACK" });
      });
      return true; // keep channel open for async sendResponse
    }

    return true;
  });
});
