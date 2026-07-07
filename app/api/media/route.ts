import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getAccessibleMediaStream } from "@/lib/media/library";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "24", 10);
  const mediaType = searchParams.get("mediaType") as "image" | "video" | null;
  const albumId = searchParams.get("albumId");
  const uploaderId = searchParams.get("uploaderId");

  try {
    const result = await getAccessibleMediaStream(prisma, {
      userId: user.id,
      mediaType: mediaType ?? undefined,
      albumId: albumId ?? undefined,
      uploaderId: uploaderId ?? undefined,
      page,
      pageSize,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取媒体列表失败" },
      { status: 400 }
    );
  }
}
