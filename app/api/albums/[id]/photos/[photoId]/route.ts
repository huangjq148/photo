import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { removePhotoFromAlbum } from "@/lib/albums/library";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; photoId: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id, photoId } = await context.params;

  try {
    await removePhotoFromAlbum(prisma, {
      albumId: id,
      userId: user.id,
      photoId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove photo from album";
    const status = message === "Album not found" ? 404 : message.includes("member") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
