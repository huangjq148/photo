import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { Readable } from "node:stream";
import type { PrismaClient } from "@prisma/client";
import { getStorageLayout } from "@/lib/storage/paths";
import { resolvePublicAlbumShareMedia } from "@/lib/albums/shares";

const ALLOWED_VARIANTS = ["thumbnail", "preview", "original"] as const;
type Variant = (typeof ALLOWED_VARIANTS)[number];

function getVariantDirName(variant: Variant): "originals" | "previews" | "thumbnails" {
  switch (variant) {
    case "original":
      return "originals";
    case "preview":
      return "previews";
    case "thumbnail":
      return "thumbnails";
  }
}

function resolveFileName(media: {
  storage_path: string;
  media_type: string;
}, variant: Variant): string {
  if (variant === "original" || media.media_type !== "video") {
    return media.storage_path;
  }

  const base = basename(media.storage_path, extname(media.storage_path));
  return `${base}_${variant}.jpg`;
}

export async function servePublicAlbumShareFile(
  prisma: PrismaClient,
  storageRoot: string,
  token: string,
  mediaId: string,
  variant: string,
  rangeHeader?: string | null
): Promise<Response> {
  if (!ALLOWED_VARIANTS.includes(variant as Variant)) {
    throw new Error("无效的文件类型");
  }

  const v = variant as Variant;
  const { share, media } = await resolvePublicAlbumShareMedia(prisma, token, mediaId);

  if (v === "original" && !share.allow_download) {
    throw new Error("下载已关闭");
  }

  const layout = getStorageLayout(storageRoot);
  const variantDir = getVariantDirName(v);
  const fileName = resolveFileName(media, v);
  const filePath = join(layout[variantDir], fileName);

  const fileStats = await stat(filePath).catch(() => null);
  if (!fileStats) {
    return new Response(JSON.stringify({ error: "文件不存在", code: "FILE_NOT_FOUND" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isThumbnail = v !== "original" && media.media_type === "video";
  const contentType = isThumbnail ? "image/jpeg" : media.mime_type;
  const fileSize = fileStats.size;

  const commonHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "private, no-store",
    "Accept-Ranges": "bytes",
    "X-Album-Share-Download": share.allow_download ? "allowed" : "disabled",
  };

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || start < 0) {
      return new Response("Requested range not satisfiable", {
        status: 416,
        headers: {
          "Content-Range": `bytes */${fileSize}`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const chunkSize = end - start + 1;
    const stream = createReadStream(filePath, { start, end });

    return new Response(Readable.toWeb(stream) as never, {
      status: 206,
      headers: {
        ...commonHeaders,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": String(chunkSize),
      },
    });
  }

  const stream = createReadStream(filePath);

  return new Response(Readable.toWeb(stream) as never, {
    headers: {
      ...commonHeaders,
      "Content-Length": String(fileSize),
    },
  });
}
