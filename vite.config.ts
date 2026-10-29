import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.next/**",
      "**/.wrangler/**",
      "**/target/**",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
  },
  lint: {
    ignorePatterns: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.next/**",
      "**/.wrangler/**",
      "**/target/**",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    // tsgolint currently runs out of memory inside Docker. We run `pnpm typecheck`
    // separately with the TypeScript compiler instead.
    options: { typeAware: false, typeCheck: false },
  },
  run: {
    cache: true,
  },
});
