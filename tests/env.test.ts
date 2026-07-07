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

describe("media env", () => {
  it("loads media defaults", () => {
    const env = loadEnv({
      DATABASE_URL: "postgresql://test",
      JWT_SECRET: "x".repeat(32),
      STORAGE_ROOT: "./data/storage",
    } as NodeJS.ProcessEnv);

    expect(env.MAX_IMAGE_UPLOAD_MB).toBe(20);
    expect(env.MAX_VIDEO_UPLOAD_MB).toBe(512);
    expect(env.MEDIA_WORKER_POLL_INTERVAL_MS).toBe(5000);
    expect(env.MEDIA_WORKER_CONCURRENCY).toBe(1);
  });

  it("rejects invalid worker concurrency", () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: "postgresql://test",
        JWT_SECRET: "x".repeat(32),
        MEDIA_WORKER_CONCURRENCY: "0",
      } as NodeJS.ProcessEnv)
    ).toThrow("Invalid environment configuration");
  });
});
