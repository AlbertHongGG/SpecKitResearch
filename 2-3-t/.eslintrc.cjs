/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  ignorePatterns: ["node_modules/", "dist/", "build/", ".next/", "coverage/"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  env: { es2022: true, node: true },
  overrides: [
    {
      files: ["apps/web/**/*.{ts,tsx}"],
      env: { browser: true, node: false }
    }
  ]
};
