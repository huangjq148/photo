import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { batchSetFavoritePhotos } from "@/lib/photos/library";

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      photoIds?: string[];
      favorited?: boolean;
    };

    const data = await batchSetFavoritePhotos(prisma, {
      photoIds: body.photoIds ?? [],
      userId: user.id,
      favorited: typeof body.favorited === "boolean" ? body.favorited : true,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批量收藏失败" },
      { status: 400 }
    );
  }
}
