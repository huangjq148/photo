import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { setAlbumCover } from "@/lib/albums/library";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: albumId } = await context.params;

  try {
    const body = (await request.json()) as { photoId?: string };
    if (!body.photoId) {
      return NextResponse.json({ error: "请指定照片" }, { status: 422 });
    }

    const data = await setAlbumCover(prisma, {
      albumId,
      userId: user.id,
      photoId: body.photoId,
    });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "设置封面失败";
    const status =
      message === "Photo is not in this album" ? 422 :
      message.includes("member") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
