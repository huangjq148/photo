import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { servePublicAlbumShareFile } from "@/lib/albums/public-files";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string; mediaId: string; variant: string }> }
) {
  const { token, mediaId, variant } = await context.params;

  try {
    return await servePublicAlbumShareFile(
      prisma,
      getAppEnv().STORAGE_ROOT,
      token,
      mediaId,
      variant,
      request.headers.get("range")
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";

    if (message.includes("不存在") || message.includes("不可用")) {
      return NextResponse.json({ error: "分享已失效", code: "SHARE_INVALID" }, { status: 404 });
    }
    if (message.includes("过期")) {
      return NextResponse.json({ error: "分享已失效", code: "SHARE_INVALID" }, { status: 404 });
    }
    if (message.includes("撤销")) {
      return NextResponse.json({ error: "分享已失效", code: "SHARE_INVALID" }, { status: 404 });
    }
    if (message.includes("无效的文件类型")) {
      return NextResponse.json({ error: "无效的文件类型", code: "INVALID_VARIANT" }, { status: 400 });
    }
    if (message.includes("下载已关闭")) {
      return NextResponse.json({ error: "下载已关闭", code: "DOWNLOAD_DISABLED" }, { status: 403 });
    }

    return NextResponse.json({ error: "分享已失效", code: "SHARE_INVALID" }, { status: 404 });
  }
}
