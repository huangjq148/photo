import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getAppEnv } from "@/lib/config";
import { getStorageLayout } from "@/lib/storage/paths";

const VARIANT_DIRS = {
  originals: "originals",
  previews: "previews",
  thumbnails: "thumbnails"
} as const;

type Variant = keyof typeof VARIANT_DIRS;

// Base where clause for authorized access
function authorizedWhere(userId: string) {
  return {
    OR: [
      {
        album: {
          members: {
            some: { user_id: userId }
          }
        }
      },
      {
        albumPhotos: {
          some: {
            album: {
              members: {
                some: { user_id: userId }
              }
            }
          }
        }
      }
    ]
  };
}

async function findMedia(fileName: string, userId: string) {
  // Try exact storage_path match first
  const exact = await prisma.media.findFirst({
    where: {
      storage_path: fileName,
      ...authorizedWhere(userId),
    },
    select: {
      mime_type: true,
      original_name: true,
      storage_path: true,
      album: { select: { id: true } },
    },
  });

  if (exact) return { media: exact, isThumbnail: false };

  // For video thumbnails/previews: fileName is like "uuid_thumb.jpg" or "uuid_preview.jpg"
  // The storage_path in DB is "uuid.mp4". Try to match by base name.
  const match = fileName.match(/^(.+?)_(thumb|preview)\.jpg$/);
  if (!match) return { media: null, isThumbnail: false };

  const baseId = match[1];
  const media = await prisma.media.findFirst({
    where: {
      storage_path: { startsWith: baseId + "." },
      media_type: "video",
      ...authorizedWhere(userId),
    },
    select: {
      mime_type: true,
      original_name: true,
      storage_path: true,
      album: { select: { id: true } },
    },
  });

  return { media, isThumbnail: true };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ variant: string; fileName: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { variant, fileName } = await context.params;
  if (!(variant in VARIANT_DIRS)) {
    return NextResponse.json({ error: "无效的文件类型" }, { status: 400 });
  }

  const { media, isThumbnail } = await findMedia(fileName, user.id);

  if (!media) {
    return NextResponse.json({ error: "资源不存在" }, { status: 404 });
  }

  const layout = getStorageLayout(getAppEnv().STORAGE_ROOT);
  const filePath = join(layout[variant as Variant], fileName);

  const fileStats = await stat(filePath).catch(() => null);
  if (!fileStats) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const isVideo = media.mime_type.startsWith("video/");
  const contentType = isThumbnail ? "image/jpeg" : media.mime_type;
  const fileSize = fileStats.size;

  // Range request support for video streaming
  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    if (start >= fileSize) {
      return new Response("Requested range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const stream = createReadStream(filePath, { start, end });
    return new Response(Readable.toWeb(stream) as never, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Type": contentType,
        "Content-Length": String(chunkSize),
        "Accept-Ranges": "bytes",
      },
    });
  }

  const stream = createReadStream(filePath);

  return new Response(Readable.toWeb(stream) as never, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
    }
  });
}
