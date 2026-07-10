/**
 * Read-only audit: checks if deprecated Space tables contain any
 * rows that haven't been migrated to the Album model.
 *
 * Usage: dotenv -e .env.local -- tsx scripts/audit-space-migration.ts
 */

import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  let exitCode = 0;

  try {
    const spaceCount = await prisma.space.count();
    const memberCount = await prisma.spaceMember.count();
    const inviteCount = await prisma.spaceInvite.count();

    console.log("--- Space Migration Audit ---");
    console.log(`Space records:       ${spaceCount}`);
    console.log(`SpaceMember records: ${memberCount}`);
    console.log(`SpaceInvite records: ${inviteCount}`);

    if (spaceCount > 0 || memberCount > 0 || inviteCount > 0) {
      console.log("\n❌ UNSAFE: Deprecated Space tables still contain data.");
      console.log("   Please migrate data to Album model before removing Space tables.");
      exitCode = 1;
    } else {
      console.log("\n✅ Safe to remove deprecated Space tables.");
    }
  } catch (error) {
    console.error("Audit failed:", error);
    exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }

  process.exit(exitCode);
}

main();
