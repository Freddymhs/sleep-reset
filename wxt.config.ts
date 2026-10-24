import { defineConfig } from "wxt";

export default defineConfig({
  outDir: "dist",
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react"],
  manifest: {
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
