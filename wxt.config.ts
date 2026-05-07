import { defineConfig } from "wxt";

export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "My Extension",
    description: "A Chrome extension built with WXT + React + TypeScript",
    version: "0.1.0",
    permissions: ["storage", "activeTab"],
  },
});
