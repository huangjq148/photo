import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getMapMediaPoints, mapQuerySchema } from "@/lib/media/map";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const query = mapQuerySchema.parse({
      includeHidden: searchParams.get("includeHidden") ?? undefined,
    });

    const data = await getMapMediaPoints(prisma, {
      userId: user.id,
      includeHidden: query.includeHidden,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载地图数据失败", code: "LOAD_FAILED" },
      { status: 400 }
    );
  }
}
