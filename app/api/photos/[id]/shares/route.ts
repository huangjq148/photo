import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { createPhotoShare, listPhotoShares } from "@/lib/media/shares";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    const expiresInHours = body.expiresInHours ?? null;

    const data = await createPhotoShare(prisma, {
      photoId: id,
      userId: user.id,
      expiresInHours,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建分享链接失败";
    const code = message.includes("有效期") ? "INVALID_EXPIRY" : "CREATE_SHARE_FAILED";
    const status = message.includes("有效期") ? 422 : 400;
    return NextResponse.json({ error: message, code }, { status });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const data = await listPhotoShares(prisma, {
      photoId: id,
      userId: user.id,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取分享列表失败", code: "LIST_SHARES_FAILED" },
      { status: 400 }
    );
  }
}
