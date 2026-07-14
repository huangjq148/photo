import { defineWorkspace } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineWorkspace([
  {
    test: {
      name: "unit",
      include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
      exclude: [
        "tests/**/*.integration.test.ts",
        ".codex/**",
        "node_modules/**",
        ".next/**"
      ],
      fileParallelism: false,
      environment: "node",
      globals: true,
    },
    resolve: {
      alias: {
        "@": resolve(rootDir, ".")
      }
    }
  },
  {
    test: {
      name: "integration",
      include: ["tests/**/*.integration.test.ts"],
      exclude: [
        ".codex/**",
        "node_modules/**",
        ".next/**"
      ],
      fileParallelism: false,
      environment: "node",
      globals: true,
      setupFiles: ["./tests/setup.ts"],
    },
    resolve: {
      alias: {
        "@": resolve(rootDir, ".")
      }
    }
  }
]);
