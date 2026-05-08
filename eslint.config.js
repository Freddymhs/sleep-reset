import js from "@eslint/js";
import tsEslint from "typescript-eslint";

export default tsEslint.config(
  js.configs.recommended,
  ...tsEslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // WXT / browser extension globals
        browser: "readonly",
        chrome: "readonly",
        defineBackground: "readonly",
        defineContentScript: "readonly",
        // Browser DOM globals (content scripts run in page context)
        window: "readonly",
        document: "readonly",
        console: "readonly",
        MutationObserver: "readonly",
      },
    },
    rules: {
      // Enforce const-only (no let) — project standard
      "no-var": "error",
      "prefer-const": "error",
      // No empty catch blocks
      "no-empty": ["error", { allowEmptyCatch: false }],
      // No any without justification — warn only; strict mode handles the rest via tsconfig
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused vars prefixed with _ (common for callbacks)
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: [
      ".output/**",
      ".wxt/**",
      "node_modules/**",
      "dist/**",
    ],
  },
);
