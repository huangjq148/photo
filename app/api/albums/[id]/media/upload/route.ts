import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { uploadMediaToAlbum } from "@/lib/media/upload";
import { getUserDefaultAlbumId } from "@/lib/albums/library";
import { addPhotosToAlbum } from "@/lib/albums/library";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: albumId } = await context.params;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择文件" }, { status: 400 });
  }

  try {
    // First upload to the user's "全部照片" default album
    const defaultAlbumId = await getUserDefaultAlbumId(prisma, user.id);

    const result = await uploadMediaToAlbum(
      prisma,
      {
        storageRoot: getAppEnv().STORAGE_ROOT,
        maxImageMb: getAppEnv().MAX_IMAGE_UPLOAD_MB,
        maxVideoMb: getAppEnv().MAX_VIDEO_UPLOAD_MB,
      },
      {
        albumId: defaultAlbumId,
        userId: user.id,
        file,
      }
    );

    // If uploading to a different album, also add as reference
    if (albumId !== defaultAlbumId) {
      await addPhotosToAlbum(prisma, {
        albumId,
        userId: user.id,
        photoIds: [result.id],
      });
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败" },
      { status: 400 }
    );
  }
}
