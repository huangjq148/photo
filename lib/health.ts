import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import type { PrismaClient } from "@prisma/client";
import { getStorageLayout } from "@/lib/storage/paths";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export type HealthCheckResult = {
  component: "application" | "database" | "storage";
  status: "ok" | "degraded" | "down";
  note?: string;
};

export type HealthReport = {
  status: HealthStatus;
  checkedAt: string;
  checks: HealthCheckResult[];
};

export type HealthDependencies = {
  prisma: PrismaClient;
  storageRoot: string;
  now?: Date;
};

async function checkDatabase(prisma: PrismaClient): Promise<HealthCheckResult> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { component: "database", status: "ok" };
  } catch {
    return { component: "database", status: "down", note: "database_unavailable" };
  }
}

async function checkStorage(storageRoot: string): Promise<HealthCheckResult> {
  const layout = getStorageLayout(storageRoot);

  try {
    await access(storageRoot, constants.R_OK | constants.W_OK);
    await stat(layout.originals);
  } catch {
    return { component: "storage", status: "down", note: "storage_root_unavailable" };
  }

  const derivedChecks = await Promise.allSettled([stat(layout.previews), stat(layout.thumbnails)]);
  const derivedMissing = derivedChecks.some((result) => result.status === "rejected");

  if (derivedMissing) {
    return { component: "storage", status: "degraded", note: "derived_files_unavailable" };
  }

  return { component: "storage", status: "ok" };
}

export async function checkHealth({
  prisma,
  storageRoot,
  now = new Date()
}: HealthDependencies): Promise<HealthReport> {
  const [database, storage] = await Promise.all([checkDatabase(prisma), checkStorage(storageRoot)]);

  const status: HealthStatus =
    database.status === "down" || storage.status === "down"
      ? "unhealthy"
      : database.status === "degraded" || storage.status === "degraded"
        ? "degraded"
        : "healthy";

  return {
    status,
    checkedAt: now.toISOString(),
    checks: [
      { component: "application", status: "ok" },
      database,
      storage
    ]
  };
}
