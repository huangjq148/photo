import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    // Get all albums the user is a member of
    const memberships = await prisma.albumMember.findMany({
      where: { user_id: user.id },
      select: { album_id: true },
    });
    const albumIds = memberships.map((m) => m.album_id);

    if (albumIds.length === 0) {
      return NextResponse.json({ data: { cleared: 0 } });
    }

    // Get all deleted media in user's albums
    const deletedMedia = await prisma.media.findMany({
      where: {
        status: "deleted",
        album_id: { in: albumIds },
      },
      select: {
        id: true,
        uploader_id: true,
        size: true,
        storage_path: true,
        media_type: true,
      },
    });

    if (deletedMedia.length === 0) {
      return NextResponse.json({ data: { cleared: 0 } });
    }

    // In a transaction: delete media records and update storage counts
    await prisma.$transaction(async (tx) => {
      // Delete all media records
      await tx.media.deleteMany({
        where: {
          id: { in: deletedMedia.map((m) => m.id) },
          status: "deleted",
        },
      });

      // Update storage for each uploader
      const uploaderTotals = new Map<string, bigint>();
      for (const m of deletedMedia) {
        const current = uploaderTotals.get(m.uploader_id) ?? BigInt(0);
        uploaderTotals.set(m.uploader_id, current + BigInt(m.size));
      }

      for (const [uploaderId, totalSize] of uploaderTotals) {
        await tx.user.update({
          where: { id: uploaderId },
          data: {
            storage_used: {
              decrement: Number(totalSize),
            },
          },
        });
      }
    });

    // Best-effort file cleanup (don't block the response)
    // File cleanup would be done asynchronously in production

    return NextResponse.json({ data: { cleared: deletedMedia.length } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "清空回收站失败", code: "CLEAR_FAILED" },
      { status: 400 }
    );
  }
}
