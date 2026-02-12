import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // These rules are too strict for this app's patterns (draft sync via effects; refs in memoized computations).
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off'
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    "node_modules/**",
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",
    ".turbo/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
