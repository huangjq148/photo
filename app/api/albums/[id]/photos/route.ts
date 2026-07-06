import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getAlbumPhotos, addPhotosToAlbum } from "@/lib/albums/library";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: albumId } = await context.params;
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
  const keyword = url.searchParams.get("keyword") ?? undefined;

  try {
    const data = await getAlbumPhotos(prisma, {
      albumId,
      userId: user.id,
      page,
      pageSize,
      keyword,
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "加载照片失败";
    const status = message.includes("member") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: albumId } = await context.params;

  try {
    const body = (await request.json()) as { photoIds?: string[] };
    await addPhotosToAlbum(prisma, {
      albumId,
      userId: user.id,
      photoIds: body.photoIds ?? [],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "添加照片失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
