import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getPhotoDetails } from "@/lib/photos/library";
import { getStorageLayout } from "@/lib/storage/paths";
import { join } from "node:path";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const photo = await getPhotoDetails(prisma, { photoId: id, userId: user.id });
  const layout = getStorageLayout(getAppEnv().STORAGE_ROOT);
  const filePath = join(layout.originals, photo.storagePath);

  try {
    await stat(filePath);
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const stream = createReadStream(filePath);

  return new Response(Readable.toWeb(stream) as never, {
    headers: {
      "Content-Type": photo.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(photo.originalName)}"`
    }
  });
}
