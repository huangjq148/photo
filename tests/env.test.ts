import { describe, expect, it } from "vitest";
import { loadEnv } from "@/lib/env";

describe("loadEnv", () => {
  it("throws when DATABASE_URL is missing", () => {
    const original = process.env.DATABASE_URL;
    const originalJwt = process.env.JWT_SECRET;
    const originalStorage = process.env.STORAGE_ROOT;
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = "x".repeat(32);
    process.env.STORAGE_ROOT = "./data/storage";

    expect(() => loadEnv()).toThrowError(/DATABASE_URL/);

    if (original !== undefined) {
      process.env.DATABASE_URL = original;
    }
    if (originalJwt !== undefined) {
      process.env.JWT_SECRET = originalJwt;
    }
    if (originalStorage !== undefined) {
      process.env.STORAGE_ROOT = originalStorage;
    }
  });
});
