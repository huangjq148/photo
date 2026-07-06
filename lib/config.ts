import { loadEnv } from "@/lib/env";

let cachedEnv: ReturnType<typeof loadEnv> | null = null;

export function getAppEnv() {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }

  return cachedEnv;
}
