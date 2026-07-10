import { describe, expect, it } from "vitest";
import { getRateLimitStore, rateLimitKey } from "@/lib/auth/rate-limit";

describe("login rate limit", () => {
  it("allows up to 10 failures within 15 minutes", () => {
    const store = getRateLimitStore();
    const key = rateLimitKey(`test-${Date.now()}@test.local`, "127.0.0.1");

    // Clear any existing state
    store.clear(key);

    // 10 failures should not be blocked
    for (let i = 0; i < 10; i++) {
      const { blocked } = store.recordFailure(key);
      expect(blocked).toBe(false);
    }

    // 11th failure should be blocked
    const { blocked, retryAfterMs } = store.recordFailure(key);
    expect(blocked).toBe(true);
    expect(retryAfterMs).toBeGreaterThan(0);
  });

  it("isBlocked returns blocked after exceeding limit", () => {
    const store = getRateLimitStore();
    const key = rateLimitKey(`test-blocked-${Date.now()}@test.local`, "127.0.0.1");
    store.clear(key);

    // Record 11 failures
    for (let i = 0; i < 11; i++) {
      store.recordFailure(key);
    }

    const { blocked } = store.isBlocked(key);
    expect(blocked).toBe(true);
  });

  it("clear resets the counter", () => {
    const store = getRateLimitStore();
    const key = rateLimitKey(`test-clear-${Date.now()}@test.local`, "127.0.0.1");
    store.clear(key);

    // Record 11 failures
    for (let i = 0; i < 11; i++) {
      store.recordFailure(key);
    }

    // Clear
    store.clear(key);

    const { blocked } = store.isBlocked(key);
    expect(blocked).toBe(false);
  });

  it("different emails have separate limits", () => {
    const store = getRateLimitStore();
    const key1 = rateLimitKey(`test-sep-a-${Date.now()}@test.local`, "127.0.0.1");
    const key2 = rateLimitKey(`test-sep-b-${Date.now()}@test.local`, "127.0.0.1");
    store.clear(key1);
    store.clear(key2);

    // Exhaust key1
    for (let i = 0; i < 11; i++) {
      store.recordFailure(key1);
    }

    expect(store.isBlocked(key1).blocked).toBe(true);
    expect(store.isBlocked(key2).blocked).toBe(false);
  });
});
