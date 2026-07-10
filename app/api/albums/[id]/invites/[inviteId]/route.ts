import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { revokeAlbumInvite } from "@/lib/albums/library";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; inviteId: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id: albumId, inviteId } = await context.params;

  try {
    await revokeAlbumInvite(prisma, { inviteId, albumId, userId: user.id });
    return NextResponse.json({ data: { revoked: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "撤销邀请失败";
    const code = message.includes("只有相册拥有者") ? "FORBIDDEN"
      : message.includes("不存在") ? "NOT_FOUND" : "REVOKE_FAILED";
    const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: message, code }, { status });
  }
}
