import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(rootDir, ".")
    }
  },
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: [".codex/**", "node_modules/**", ".next/**"],
    fileParallelism: false,
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:6000/photo_management_test?schema=public",
      JWT_SECRET: "test_secret_for_testing_only_123456789",
      STORAGE_ROOT: "./data/storage-test",
    },
  }
});
