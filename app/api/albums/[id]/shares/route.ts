import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { createAlbumShare, listAlbumShares } from "@/lib/albums/shares";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: albumId } = await context.params;

  try {
    const data = await listAlbumShares(prisma, { albumId, userId: user.id });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "加载分享失败";
    const status = message === "你不在这个相册中" || message === "只有相册拥有者可以执行此操作" ? 403 : 400;
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
    const body = (await request.json()) as { expiresInHours?: number | null; allowDownload?: boolean };
    const data = await createAlbumShare(prisma, {
      albumId,
      userId: user.id,
      expiresInHours: body.expiresInHours,
      allowDownload: body.allowDownload,
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建分享失败";
    const status = message === "你不在这个相册中" || message === "只有相册拥有者可以执行此操作" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
