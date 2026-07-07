import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getMediaDetail } from "@/lib/media/library";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const detail = await getMediaDetail(prisma, id, user.id);
    return NextResponse.json({ data: detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取媒体详情失败";
    const status = message.includes("不存在") || message.includes("不在") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
