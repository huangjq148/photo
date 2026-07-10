import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { acceptAlbumInvite } from "@/lib/albums/library";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { token } = await context.params;

  try {
    const data = await acceptAlbumInvite(prisma, { token, userId: user.id });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "接受邀请失败";
    const code = message.includes("不存在") ? "NOT_FOUND"
      : message.includes("过期") ? "EXPIRED"
      : message.includes("不一致") ? "EMAIL_MISMATCH"
      : message.includes("失效") ? "INVALID" : "ACCEPT_FAILED";
    const status = code === "NOT_FOUND" ? 404
      : code === "EXPIRED" ? 410
      : code === "EMAIL_MISMATCH" ? 403
      : code === "INVALID" ? 410 : 400;
    return NextResponse.json({ error: message, code }, { status });
  }
}
