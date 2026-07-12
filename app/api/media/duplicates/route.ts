import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { duplicateQuerySchema, getDuplicateMediaGroups } from "@/lib/media/duplicates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    duplicateQuerySchema.parse({
      includeDeleted: searchParams.get("includeDeleted") ?? undefined,
    });

    const data = await getDuplicateMediaGroups(prisma, user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载重复项失败", code: "LOAD_FAILED" },
      { status: 400 }
    );
  }
}
