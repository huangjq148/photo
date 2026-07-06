import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getAlbumDetail, updateAlbum, deleteAlbum } from "@/lib/albums/library";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const data = await getAlbumDetail(prisma, { albumId: id, userId: user.id });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "加载相册失败";
    const status = message === "Album not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as { name?: string; description?: string };
    const data = await updateAlbum(prisma, {
      albumId: id,
      userId: user.id,
      name: body.name,
      description: body.description,
    });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新相册失败";
    const status =
      message === "Album not found" ? 404 :
      message.includes("member") ? 403 :
      message.includes("immutable") ? 403 :
      message.includes("cannot be edited") ? 403 :
      400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await deleteAlbum(prisma, { albumId: id, userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "删除相册失败";
    const status =
      message === "Album not found" ? 404 :
      message.includes("owner") ? 403 :
      message.includes("immutable") ? 403 :
      400;
    return NextResponse.json({ error: message }, { status });
  }
}
