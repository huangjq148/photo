import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getPhotoDetails, softDeletePhoto, updatePhotoTakenAt } from "@/lib/photos/library";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const data = await getPhotoDetails(prisma, { photoId: id, userId: user.id });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load photo" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await softDeletePhoto(prisma, { photoId: id, userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete photo" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as { takenAt?: string | null };
    const data = await updatePhotoTakenAt(prisma, {
      photoId: id,
      userId: user.id,
      takenAt: body.takenAt,
    });

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "拍摄时间保存失败，请重试";
    const status =
      message === "你不在这个相册中" || message === "你没有权限修改拍摄时间"
        ? 403
        : message === "媒体文件不存在"
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
