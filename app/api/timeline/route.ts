import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getTimelinePhotos, timelineQuerySchema } from "@/lib/media/timeline";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = timelineQuerySchema.parse({
      cursor: searchParams.get("cursor") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });

    const data = await getTimelinePhotos(prisma, {
      userId: user.id,
      cursor: query.cursor,
      pageSize: query.pageSize,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载时间线失败", code: "LOAD_FAILED" },
      { status: 400 }
    );
  }
}
