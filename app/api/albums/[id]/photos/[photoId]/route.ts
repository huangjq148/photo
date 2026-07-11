import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { removePhotoFromAlbum, updateAlbumPhotoDisplayName } from "@/lib/albums/library";

export const dynamic = "force-dynamic";

function toStatus(message: string) {
  if (message === "你不在这个相册中" || message === "你没有权限编辑此名称") {
    return 403;
  }

  if (message === "相册不存在" || message === "该媒体已不存在") {
    return 404;
  }

  return 400;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; photoId: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: albumId, photoId } = await context.params;

  try {
    const body = (await request.json()) as { displayName?: string | null };
    const data = await updateAlbumPhotoDisplayName(prisma, {
      albumId,
      photoId,
      userId: user.id,
      displayName: body.displayName,
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "名称保存失败，请重试";
    return NextResponse.json({ error: message }, { status: toStatus(message) });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; photoId: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: albumId, photoId } = await context.params;

  try {
    await removePhotoFromAlbum(prisma, {
      albumId,
      photoId,
      userId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除照片失败";

    if (message === "相册不存在") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes("member") || message.includes("权限")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
