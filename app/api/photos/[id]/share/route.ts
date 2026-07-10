import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { createPhotoShare } from "@/lib/photos/shares";

// DEPRECATED: Use POST /api/photos/:id/shares instead
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const data = await createPhotoShare(prisma, {
      photoId: id,
      userId: user.id
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建分享链接失败" },
      { status: 400 }
    );
  }
}
