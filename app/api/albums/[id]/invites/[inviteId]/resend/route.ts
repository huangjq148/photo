import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { resendAlbumInvite } from "@/lib/albums/library";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; inviteId: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id: albumId, inviteId } = await context.params;

  try {
    const data = await resendAlbumInvite(prisma, { inviteId, albumId, userId: user.id });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "重新发送失败";
    const code = message.includes("只有相册拥有者") ? "FORBIDDEN"
      : message.includes("不存在") ? "NOT_FOUND" : "RESEND_FAILED";
    const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: message, code }, { status });
  }
}
