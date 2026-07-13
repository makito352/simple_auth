/**
 * @file  frontend/eslint.config.mjs
 * ESLint 設定ファイル
 */
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort"; // ← 追加

export default defineConfig([
  // Next.js 推奨ルール
  ...nextVitals,

  // TypeScript の lint（any チェック含む）
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict, // ← any や unsafe を強めにチェック

  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true, // 型情報を使うルールを有効化（TS 5 以降）
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error", // any を禁止
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "simple-import-sort/imports": "error",
    },
  },
]);