import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { getUserAlbums, createAlbum } from "@/lib/albums/library";

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const data = await getUserAlbums(prisma, user.id);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载相册失败" },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { name?: string; description?: string };
    const data = await createAlbum(prisma, {
      userId: user.id,
      name: String(body.name ?? ""),
      description: body.description ? String(body.description) : undefined,
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建相册失败";
    const status = message.includes("required") ? 422 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
