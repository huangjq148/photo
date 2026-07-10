import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { servePublicShareFile } from "@/lib/media/public-files";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string; variant: string }> }
) {
  const { token, variant } = await context.params;

  try {
    const response = await servePublicShareFile(
      prisma,
      getAppEnv().STORAGE_ROOT,
      token,
      variant,
      request.headers.get("range")
    );
    return response;
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

    return NextResponse.json({ error: "分享已失效", code: "SHARE_INVALID" }, { status: 404 });
  }
}
