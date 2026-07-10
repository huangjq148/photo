import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getAlbumInvites, createAlbumInvite } from "@/lib/albums/library";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: albumId } = await context.params;

  try {
    const data = await getAlbumInvites(prisma, { albumId, userId: user.id });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "加载邀请失败";
    const status = message.includes("member") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id: albumId } = await context.params;

  try {
    const body = (await request.json()) as { email?: string };
    if (!body.email || !body.email.includes("@")) {
      return NextResponse.json({ error: "请输入有效的邮箱地址", code: "INVALID_EMAIL" }, { status: 422 });
    }

    const data = await createAlbumInvite(prisma, {
      albumId,
      userId: user.id,
      email: body.email,
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建邀请失败";
    const status =
      message.includes("已有待处理") ? 409 :
      message.includes("已是此相册成员") ? 409 :
      message.includes("邮箱") ? 422 : 400;
    const code = status === 409 ? "DUPLICATE" : status === 422 ? "INVALID_INPUT" : "CREATE_FAILED";
    return NextResponse.json({ error: message, code }, { status });
  }
}
