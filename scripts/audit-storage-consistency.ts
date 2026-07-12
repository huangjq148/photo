/**
 * Read-only audit for media storage consistency.
 *
 * Usage:
 *   dotenv -e .env.local -- tsx scripts/audit-storage-consistency.ts
 */

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getAppEnv } from "@/lib/config";
import { formatStorageConsistencyReport, runStorageConsistencyAudit } from "@/lib/storage/audit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, "../.env.local"), override: false });
config({ path: resolve(__dirname, "../.env"), override: false });

async function main() {
  const prisma = new PrismaClient();

  try {
    const report = await runStorageConsistencyAudit({
      prisma,
      storageRoot: getAppEnv().STORAGE_ROOT,
    });

    for (const line of formatStorageConsistencyReport(report)) {
      console.log(line);
    }

    process.exit(report.status === "healthy" ? 0 : 1);
  } catch (error) {
    console.error("Storage audit failed:", error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
