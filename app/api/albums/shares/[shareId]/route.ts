import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { revokeAlbumShare } from "@/lib/albums/shares";

export async function DELETE(request: NextRequest, context: { params: Promise<{ shareId: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { shareId } = await context.params;

  try {
    await revokeAlbumShare(prisma, shareId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "撤销分享失败";
    const status = message === "无权管理此分享" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
