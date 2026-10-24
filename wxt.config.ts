import { defineConfig } from "wxt";

export default defineConfig({
  outDir: "dist",
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    // Pins a stable Extension ID (fmeldfmlmekbchigjpbkdmhmbfofddjd) across machines
    // and reinstalls, so the chrome.identity OAuth redirect URL
    // (https://<id>.chromiumapp.org/) stays constant. Public key — safe to commit.
    key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvA31FohJwBVZPD4XVDGLfWx7lXJYtD+K58Ef7IUEAKw1h7W7ADrxSX+iWtveOZCCfa/zWtd99xyEcYu34f9pD4Q2pLJ0g3NsH+KPmGtCemx1p7PkEcL0bYDehLDzENoSR8ph3tcVnRmAmJda8ApltyK1ka2i7zPgMqq7DgI3Vp5sXBppipSAN1HtBmN7Xv/Ln7C9bGBEAjDltR0NYBdP/L6Hfd+LE8TcQSj8VtrYxRJmdnlFjPeXdqmfVpqat2NiNTT6XYQOljCqHR3/SKzSEIQkqwbc5rwjoZSn/9L4oCtTxO2yLuJGT8Fmle/Zk3HyTk3kGIhcFQmnioVw1inJQQIDAQAB",
    name: "Sleep Reset",
    description: "Reset your sleep schedule with a gradual 3-pillar protocol: melatonin timing, bedtime correction, and morning light exposure.",
    version: "0.1.0",
    permissions: ["storage", "identity"],
    host_permissions: ["https://*.supabase.co/*"],
    icons: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png",
    },
    action: {
      default_icon: {
        "16": "icons/icon-16.png",
        "32": "icons/icon-32.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png",
      },
    },
  },
});
