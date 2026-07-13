import { describe, expect, it } from "vitest";
import { loadEnv } from "@/lib/env";

describe("admin env defaults", () => {
  it("uses qwerty123 when ADMIN_PASSWORD is not configured outside production", () => {
    const runtimeEnv = process.env as Record<string, string | undefined>;
    const originalNodeEnv = runtimeEnv.NODE_ENV;
    const originalAdminPassword = runtimeEnv.ADMIN_PASSWORD;
    const originalDatabaseUrl = runtimeEnv.DATABASE_URL;
    const originalJwtSecret = runtimeEnv.JWT_SECRET;
    const originalStorageRoot = runtimeEnv.STORAGE_ROOT;

    runtimeEnv.NODE_ENV = "development";
    delete runtimeEnv.ADMIN_PASSWORD;
    runtimeEnv.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:6000/photo_management_test?schema=public";
    runtimeEnv.JWT_SECRET = "x".repeat(32);
    runtimeEnv.STORAGE_ROOT = "./data/storage";

    const loadedEnv = loadEnv();

    expect(loadedEnv.ADMIN_PASSWORD).toBe("qwerty123");

    if (originalNodeEnv !== undefined) {
      runtimeEnv.NODE_ENV = originalNodeEnv;
    } else {
      delete runtimeEnv.NODE_ENV;
    }

    if (originalAdminPassword !== undefined) {
      runtimeEnv.ADMIN_PASSWORD = originalAdminPassword;
    } else {
      delete runtimeEnv.ADMIN_PASSWORD;
    }
    if (originalDatabaseUrl !== undefined) {
      runtimeEnv.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete runtimeEnv.DATABASE_URL;
    }
    if (originalJwtSecret !== undefined) {
      runtimeEnv.JWT_SECRET = originalJwtSecret;
    } else {
      delete runtimeEnv.JWT_SECRET;
    }
    if (originalStorageRoot !== undefined) {
      runtimeEnv.STORAGE_ROOT = originalStorageRoot;
    } else {
      delete runtimeEnv.STORAGE_ROOT;
    }
  });

  it("requires ADMIN_PASSWORD in production", () => {
    const runtimeEnv = process.env as Record<string, string | undefined>;
    const originalNodeEnv = runtimeEnv.NODE_ENV;
    const originalAdminPassword = runtimeEnv.ADMIN_PASSWORD;
    const originalDatabaseUrl = runtimeEnv.DATABASE_URL;
    const originalJwtSecret = runtimeEnv.JWT_SECRET;
    const originalStorageRoot = runtimeEnv.STORAGE_ROOT;

    runtimeEnv.NODE_ENV = "production";
    delete runtimeEnv.ADMIN_PASSWORD;
    runtimeEnv.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:6000/photo_management_test?schema=public";
    runtimeEnv.JWT_SECRET = "x".repeat(32);
    runtimeEnv.STORAGE_ROOT = "./data/storage";

    expect(() => loadEnv()).toThrow(/ADMIN_PASSWORD/);

    if (originalNodeEnv !== undefined) {
      runtimeEnv.NODE_ENV = originalNodeEnv;
    } else {
      delete runtimeEnv.NODE_ENV;
    }

    if (originalAdminPassword !== undefined) {
      runtimeEnv.ADMIN_PASSWORD = originalAdminPassword;
    } else {
      delete runtimeEnv.ADMIN_PASSWORD;
    }
    if (originalDatabaseUrl !== undefined) {
      runtimeEnv.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete runtimeEnv.DATABASE_URL;
    }
    if (originalJwtSecret !== undefined) {
      runtimeEnv.JWT_SECRET = originalJwtSecret;
    } else {
      delete runtimeEnv.JWT_SECRET;
    }
    if (originalStorageRoot !== undefined) {
      runtimeEnv.STORAGE_ROOT = originalStorageRoot;
    } else {
      delete runtimeEnv.STORAGE_ROOT;
    }
  });
});
