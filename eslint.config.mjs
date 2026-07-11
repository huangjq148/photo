import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooksPlugin from "eslint-plugin-react-hooks";

const sharedFiles = ["**/*.{js,mjs,cjs,ts,tsx}"];

const ignores = [
  ".agents/**",
  ".next/**",
  "node_modules/**",
  "data/**",
  "coverage/**",
  "test-results/**",
  "playwright-report/**",
  ".worktrees/**",
  "next-env.d.ts"
];

export default [
  {
    ignores
  },
  {
    files: sharedFiles,
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module"
    },
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooksPlugin
    },
    rules: {
      ...nextPlugin.flatConfig.coreWebVitals.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ]
    }
  }
];
