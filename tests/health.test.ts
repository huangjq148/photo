import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { checkHealth } from "@/lib/health";
import { getStorageLayout } from "@/lib/storage/paths";

function createPrismaMock(databaseHealthy = true) {
  return {
    $queryRaw: databaseHealthy
      ? vi.fn().mockResolvedValue([{ "?column?": 1 }])
      : vi.fn().mockRejectedValue(new Error("database down"))
  } as never;
}

describe("health checks", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "health-check-"));

  beforeAll(() => {
    const layout = getStorageLayout(storageRoot);
    mkdirSync(layout.originals, { recursive: true });
    mkdirSync(layout.previews, { recursive: true });
    mkdirSync(layout.thumbnails, { recursive: true });
  });

  afterAll(() => {
    rmSync(storageRoot, { recursive: true, force: true });
  });

  it("reports healthy when database and storage are available", async () => {
    const report = await checkHealth({
      prisma: createPrismaMock(true),
      storageRoot,
      now: new Date("2026-07-12T00:00:00.000Z")
    });

    expect(report.status).toBe("healthy");
    expect(report.checks.map((check) => check.status)).toEqual(["ok", "ok", "ok"]);
  });

  it("reports unhealthy when the database is unavailable", async () => {
    const report = await checkHealth({
      prisma: createPrismaMock(false),
      storageRoot,
      now: new Date("2026-07-12T00:00:00.000Z")
    });

    expect(report.status).toBe("unhealthy");
    expect(report.checks.find((check) => check.component === "database")?.status).toBe("down");
  });
});
