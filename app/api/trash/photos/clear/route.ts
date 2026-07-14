import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { clearTrashPhotos } from "@/lib/photos/library";

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const cleared = await clearTrashPhotos(prisma, user.id);
    return NextResponse.json({ data: { cleared } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "清空回收站失败", code: "CLEAR_FAILED" },
      { status: 400 }
    );
  }
}
