import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getUserDefaultAlbumId } from "@/lib/albums/library";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const defaultAlbumId = await getUserDefaultAlbumId(prisma, user.id);
    return NextResponse.json({ data: { defaultAlbumId } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取默认相册失败" },
      { status: 400 }
    );
  }
}
