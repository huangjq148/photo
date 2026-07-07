import type { PrismaClient } from "@prisma/client";

export async function claimPendingVideoJob(prisma: PrismaClient) {
  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.$queryRaw<Array<{ id: string }>>`
      WITH next_job AS (
        SELECT id
        FROM "Photo"
        WHERE media_type = 'video'
          AND processing_status = 'pending'
        ORDER BY uploaded_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "Photo"
      SET processing_status = 'processing',
          processing_error = NULL,
          updated_at = NOW()
      WHERE id IN (SELECT id FROM next_job)
      RETURNING id;
    `;

    if (claimed.length === 0) return null;

    return tx.photo.findUnique({
      where: { id: claimed[0].id },
    });
  });

  return result;
}
