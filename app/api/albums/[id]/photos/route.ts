import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getAlbumPhotos, addPhotosToAlbum } from "@/lib/albums/library";
import { jsonError } from "@/lib/api/errors";

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
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const excludeAlbumId = url.searchParams.get("excludeAlbumId") ?? undefined;

  if (!Number.isFinite(pageSize) || pageSize > 200) {
    return jsonError("VALIDATION_ERROR", "单次最多 200 张", 422, [
      { path: "pageSize", message: "单次最多 200 张" },
    ]);
  }

  try {
    const data = await getAlbumPhotos(prisma, {
      albumId,
      userId: user.id,
      page,
      pageSize,
      keyword,
      cursor,
      excludeAlbumId,
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
    const photoIds = Array.from(new Set(body.photoIds ?? []));

    if (photoIds.length > 200) {
      return jsonError("VALIDATION_ERROR", "单次最多添加 200 张", 422, [
        { path: "photoIds", message: "单次最多添加 200 张" },
      ]);
    }

    const result = await addPhotosToAlbum(prisma, {
      albumId,
      userId: user.id,
      photoIds,
    });
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "添加照片失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
