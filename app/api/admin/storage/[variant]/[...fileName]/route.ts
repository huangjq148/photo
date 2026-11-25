import { createReadStream } from "node:fs";
import { lstat, realpath } from "node:fs/promises";
import { extname } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAppEnv } from "@/lib/config";
import { getCurrentAdminSessionFromCookieStore } from "@/lib/auth/admin-session";
import { resolveAdminStorageFilePath } from "@/lib/admin/file-tree";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".heic": "image/heic",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

function getContentType(fileName: string) {
  return MIME_BY_EXT[extname(fileName).toLowerCase()] ?? "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ variant: string; fileName: string[] }> }
) {
  const session = getCurrentAdminSessionFromCookieStore(request.cookies, getAppEnv().JWT_SECRET);
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { variant, fileName } = await context.params;
  if (variant !== "originals" && variant !== "previews" && variant !== "thumbnails") {
    return NextResponse.json({ error: "无效的文件类型" }, { status: 400 });
  }

  let filePath: string;
  try {
    filePath = resolveAdminStorageFilePath(
      getAppEnv().STORAGE_ROOT,
      variant as "originals" | "previews" | "thumbnails",
      fileName.join("/"),
    );
    const [storageRootPath, resolvedFilePath] = await Promise.all([
      realpath(getAppEnv().STORAGE_ROOT),
      realpath(filePath),
    ]);
    if (
      resolvedFilePath !== storageRootPath &&
      !resolvedFilePath.startsWith(`${storageRootPath}/`)
    ) {
      throw new Error("文件路径越界");
    }
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const fileStats = await lstat(filePath).catch(() => null);
  if (!fileStats || !fileStats.isFile() || fileStats.isSymbolicLink()) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const stream = createReadStream(filePath);
  return new Response(Readable.toWeb(stream) as never, {
    headers: {
      "Content-Type": getContentType(fileName[fileName.length - 1] ?? ""),
      "Content-Length": String(fileStats.size),
      "Accept-Ranges": "bytes",
    },
  });
}
