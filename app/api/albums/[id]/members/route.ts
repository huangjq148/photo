import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getAlbumMembers, updateMemberPermissions, removeAlbumMember } from "@/lib/albums/library";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: albumId } = await context.params;

  try {
    const data = await getAlbumMembers(prisma, { albumId, userId: user.id });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "加载成员失败";
    const status = message.includes("member") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: albumId } = await context.params;

  try {
    const body = (await request.json()) as { userId?: string };
    if (!body.userId) {
      return NextResponse.json({ error: "请指定用户" }, { status: 422 });
    }

    await removeAlbumMember(prisma, {
      albumId,
      userId: user.id,
      targetUserId: body.userId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "移除成员失败";
    const status =
      message.includes("owner") ? 403 :
      message.includes("themselves") ? 422 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: albumId } = await context.params;

  try {
    const body = (await request.json()) as {
      userId?: string;
      canUpload?: boolean;
      canDelete?: boolean;
    };

    if (!body.userId) {
      return NextResponse.json({ error: "请指定用户" }, { status: 422 });
    }

    await updateMemberPermissions(prisma, {
      albumId,
      userId: user.id,
      targetUserId: body.userId,
      canUpload: body.canUpload,
      canDelete: body.canDelete,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "修改权限失败";
    const status = message.includes("owner") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
