import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { getStorageLayout } from "@/lib/storage/paths";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  const share = await prisma.photoShare.findUnique({
    where: { token },
    include: {
      photo: true,
    },
  });

  if (!share) {
    return NextResponse.json({ error: "分享链接不存在" }, { status: 404 });
  }

  if (share.revoked_at) {
    return NextResponse.json({ error: "分享链接已被撤销" }, { status: 404 });
  }

  if (share.expires_at && share.expires_at.getTime() < Date.now()) {
    return NextResponse.json({ error: "分享链接已过期" }, { status: 404 });
  }

  if (share.photo.status === "deleted") {
    return NextResponse.json({ error: "媒体不可用" }, { status: 404 });
  }

  if (share.photo.media_type !== "video") {
    return NextResponse.json({ error: "非视频媒体" }, { status: 400 });
  }

  if (share.photo.processing_status !== "normal") {
    return NextResponse.json({ error: "视频暂不可播放" }, { status: 409 });
  }

  if (!share.photo.playback_url) {
    return NextResponse.json({ error: "播放资源不存在" }, { status: 404 });
  }

  const layout = getStorageLayout(getAppEnv().STORAGE_ROOT);

  // Extract fileName from playback_url (format: /api/files/playbacks/<fileName>)
  const playbackFile = share.photo.playback_url.replace("/api/files/playbacks/", "");
  const filePath = join(layout.playbacks, playbackFile);

  let fileSize: number;
  try {
    const statResult = await stat(filePath);
    fileSize = statResult.size;
  } catch {
    return NextResponse.json({ error: "播放文件不存在" }, { status: 404 });
  }

  const range = request.headers.get("range");

  if (range) {
    // Parse Range header: bytes=0-1024
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${fileSize}`,
        },
      });
    }

    const chunkSize = end - start + 1;
    const stream = createReadStream(filePath, { start, end });

    return new NextResponse(stream as never, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": "video/mp4",
      },
    });
  }

  const stream = createReadStream(filePath);
  return new NextResponse(stream as never, {
    status: 200,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(fileSize),
      "Content-Type": "video/mp4",
    },
  });
}
