import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  // Electron main/preload run as CommonJS.
  { files: ["desktop/**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent skills are vendored copies managed by skills-lock.json, and
    // .claude/worktrees holds duplicate checkouts of this app.
    ".claude/**",
    ".agents/**",
    // Desktop app build output.
    ".next-desktop/**",
    "dist-desktop/**",
  ]),
]);

export default eslintConfig;
