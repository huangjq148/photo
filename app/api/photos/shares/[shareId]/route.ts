import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { revokePhotoShare } from "@/lib/media/shares";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ shareId: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { shareId } = await context.params;

  try {
    await revokePhotoShare(prisma, shareId, user.id);
    return NextResponse.json({ data: { revoked: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "撤销分享失败";
    const code = message.includes("无权")
      ? "FORBIDDEN"
      : message.includes("不存在")
        ? "NOT_FOUND"
        : "REVOKE_FAILED";
    const status = code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: message, code }, { status });
  }
}
