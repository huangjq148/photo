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
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { token } = await context.params;

  try {
    const data = await acceptAlbumInvite(prisma, { token, userId: user.id });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "接受邀请失败";
    const status =
      message === "Invite not found" ? 404 :
      message.includes("expired") ? 410 :
      message.includes("different email") ? 403 :
      message.includes("no longer valid") ? 410 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
