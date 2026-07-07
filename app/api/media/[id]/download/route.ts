import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getStorageLayout } from "@/lib/storage/paths";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;

  const media = await prisma.photo.findUnique({
    where: { id },
    include: {
      album: {
        select: {
          members: {
            where: { user_id: user.id },
            take: 1,
          },
        },
      },
    },
  });

  if (!media) {
    return NextResponse.json({ error: "媒体不存在" }, { status: 404 });
  }

  if (media.album.members.length === 0) {
    // Check linked albums
    const linkedRef = await prisma.albumPhoto.findFirst({
      where: {
        photo_id: media.id,
        album: {
          members: {
            some: { user_id: user.id },
          },
        },
      },
    });

    if (!linkedRef) {
      return NextResponse.json({ error: "你不在这个相册中" }, { status: 403 });
    }
  }

  const layout = getStorageLayout(getAppEnv().STORAGE_ROOT);
  const originalPath = join(layout.originals, media.storage_path);

  try {
    await stat(originalPath);
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const stream = createReadStream(originalPath);

  return new Response(Readable.toWeb(stream) as never, {
    headers: {
      "Content-Type": media.mime_type,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(media.original_name)}"`,
    },
  });
}
