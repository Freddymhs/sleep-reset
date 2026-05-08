/**
 * Type-safe message passing between popup, content scripts, and background.
 *
 * Usage (from popup or content script):
 *   const response = await sendMessage({ type: "GET_DATA", payload: { url } });
 */

export type ExtensionMessage =
  | { type: "PING" }
  | { type: "GET_DATA"; payload: { url: string } }
  | { type: "AUTH_SIGN_OUT" };

export type ExtensionResponse =
  | { type: "PONG" }
  | { type: "DATA"; payload: unknown }
  | { type: "AUTH_SIGN_OUT_ACK" };

export async function sendMessage(
  message: ExtensionMessage,
): Promise<ExtensionResponse> {
  return browser.runtime.sendMessage(message);
}
