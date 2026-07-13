import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { basename, resolve } from "node:path";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { getCurrentAdminSessionFromCookieStore } from "@/lib/auth/admin-session";
import { deleteAdminFile } from "@/lib/admin/files";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const session = getCurrentAdminSessionFromCookieStore(request.cookies, getAppEnv().JWT_SECRET);
  if (!session) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { path } = await context.params;
  const dataRoot = resolve(getAppEnv().STORAGE_ROOT, "..");
  const storageRootName = basename(getAppEnv().STORAGE_ROOT);

  try {
    const relativePath = path.join("/");
    await deleteAdminFile(prisma, dataRoot, relativePath, storageRootName);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败", code: "DELETE_FAILED" },
      { status: 400 }
    );
  }
}
