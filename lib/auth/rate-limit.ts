/**
 * In-process login rate limiter.
 * Limits login attempts to MAX_FAILURES per WINDOW_MS per key.
 * Replace with Redis-based implementation before multi-instance deployment.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILURES = 10;

export interface RateLimitStore {
  recordFailure(key: string): { blocked: boolean; retryAfterMs: number };
  isBlocked(key: string): { blocked: boolean; retryAfterMs: number };
  clear(key: string): void;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; windowStart: number }>();

  recordFailure(key: string): { blocked: boolean; retryAfterMs: number } {
    this.cleanup();
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.windowStart + WINDOW_MS < now) {
      // New window
      this.store.set(key, { count: 1, windowStart: now });
      return { blocked: false, retryAfterMs: 0 };
    }

    entry.count++;
    if (entry.count > MAX_FAILURES) {
      const retryAfterMs = entry.windowStart + WINDOW_MS - now;
      return { blocked: true, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    return { blocked: false, retryAfterMs: 0 };
  }

  isBlocked(key: string): { blocked: boolean; retryAfterMs: number } {
    this.cleanup();
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.windowStart + WINDOW_MS < now) {
      return { blocked: false, retryAfterMs: 0 };
    }

    if (entry.count > MAX_FAILURES) {
      const retryAfterMs = entry.windowStart + WINDOW_MS - now;
      return { blocked: true, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    return { blocked: false, retryAfterMs: 0 };
  }

  clear(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.windowStart + WINDOW_MS < now) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton instance
let defaultStore: InMemoryRateLimitStore;

export function getRateLimitStore(): RateLimitStore {
  if (!defaultStore) {
    defaultStore = new InMemoryRateLimitStore();
  }
  return defaultStore;
}

/**
 * Build a rate limit key from email and IP.
 */
export function rateLimitKey(email: string, ip: string): string {
  return `${email.toLowerCase().trim()}:${ip}`;
}
