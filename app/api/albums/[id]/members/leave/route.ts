import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { leaveAlbum } from "@/lib/albums/library";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: albumId } = await context.params;

  try {
    await leaveAlbum(prisma, { albumId, userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "退出相册失败";
    const status =
      message.includes("owner") ? 403 :
      message.includes("不在此相册") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
