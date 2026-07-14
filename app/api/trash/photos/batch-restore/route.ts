import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { batchRestoreTrashPhotos } from "@/lib/photos/library";

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { photoIds?: string[] };
    const data = await batchRestoreTrashPhotos(prisma, {
      photoIds: body.photoIds ?? [],
      userId: user.id,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore photos" },
      { status: 400 }
    );
  }
}
