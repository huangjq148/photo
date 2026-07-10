import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { Readable } from "node:stream";
import type { PrismaClient } from "@prisma/client";
import { getPublicPhotoShare, resolvePublicShare } from "@/lib/media/shares";
import { getStorageLayout } from "@/lib/storage/paths";

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

function resolveFileName(share: Awaited<ReturnType<typeof resolvePublicShare>>, variant: Variant): string {
  const storagePath = share.media.storage_path;
  const isVideo = share.media.media_type === "video";

  if (variant === "original" || !isVideo) {
    // For images or original video files, use the storage_path directly
    return storagePath;
  }

  // For video thumbnail/preview: {basename}_thumb.jpg or {basename}_preview.jpg
  const base = basename(storagePath, extname(storagePath));
  return `${base}_${variant}.jpg`;
}

export async function servePublicShareFile(
  prisma: PrismaClient,
  storageRoot: string,
  token: string,
  variant: string,
  rangeHeader?: string | null
): Promise<Response> {
  // Validate variant
  if (!ALLOWED_VARIANTS.includes(variant as Variant)) {
    throw new Error("无效的文件类型");
  }

  const v = variant as Variant;

  // Resolve share — this checks existence, expiry, revocation, and media status
  const share = await resolvePublicShare(prisma, token);

  const layout = getStorageLayout(storageRoot);
  const variantDir = getVariantDirName(v);
  const fileName = resolveFileName(share, v);
  const filePath = join(layout[variantDir], fileName);

  const fileStats = await stat(filePath).catch(() => null);
  if (!fileStats) {
    return new Response(JSON.stringify({ error: "文件不存在", code: "FILE_NOT_FOUND" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isVideo = share.media.mime_type.startsWith("video/");
  const isThumbnail = v !== "original" && share.media.media_type === "video";
  const contentType = isThumbnail ? "image/jpeg" : share.media.mime_type;
  const fileSize = fileStats.size;

  const commonHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "private, no-store",
    "Accept-Ranges": "bytes",
  };

  // Range request support
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
