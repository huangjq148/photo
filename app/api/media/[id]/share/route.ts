import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { createPhotoShare } from "@/lib/photos/shares";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const expiresInHours = body.expiresInHours;

  try {
    const share = await createPhotoShare(prisma, {
      photoId: id,
      userId: user.id,
      expiresInHours,
    });

    return NextResponse.json({ data: share }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建分享失败" },
      { status: 400 }
    );
  }
}
