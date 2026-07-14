import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { removePhotoFromAlbum } from "@/lib/albums/library";
import { assertCanDelete } from "@/lib/membership";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: albumId } = await context.params;

  try {
    await assertCanDelete(prisma, albumId, user.id);

    const body = (await request.json()) as { photoIds?: string[] };
    const photoIds = Array.from(new Set(body.photoIds ?? []));
    for (const photoId of photoIds) {
      await removePhotoFromAlbum(prisma, { albumId, userId: user.id, photoId });
    }

    return NextResponse.json({ data: { count: photoIds.length } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除照片失败";
    const status = message.includes("permission") || message.includes("权限") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
