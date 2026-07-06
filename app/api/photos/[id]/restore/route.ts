import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { restorePhoto } from "@/lib/photos/library";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await restorePhoto(prisma, { photoId: id, userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "恢复照片失败" },
      { status: 400 }
    );
  }
}
