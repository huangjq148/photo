import { InMemoryRateLimitStore, rateLimitKey } from "@/lib/auth/rate-limit";

const store = new InMemoryRateLimitStore();

export function getAdminRateLimitStore() {
  return store;
}

export function adminRateLimitKey(ip: string) {
  return rateLimitKey("admin", ip);
}
