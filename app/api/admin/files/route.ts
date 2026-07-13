import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { basename, resolve } from "node:path";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { getCurrentAdminSessionFromCookieStore } from "@/lib/auth/admin-session";
import { listAdminFiles } from "@/lib/admin/files";

export async function GET(request: NextRequest) {
  const session = getCurrentAdminSessionFromCookieStore(request.cookies, getAppEnv().JWT_SECRET);
  if (!session) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dataRoot = resolve(getAppEnv().STORAGE_ROOT, "..");
  const storageRootName = basename(getAppEnv().STORAGE_ROOT);
  const data = await listAdminFiles(prisma, dataRoot, {
    keyword: url.searchParams.get("keyword") ?? undefined,
    page: Number(url.searchParams.get("page") ?? "1"),
    pageSize: Number(url.searchParams.get("pageSize") ?? "20"),
    sortBy: (url.searchParams.get("sortBy") as "fileName" | "relativePath" | "size" | "referenceCount" | "lastModifiedAt" | null) ?? undefined,
    sortOrder: (url.searchParams.get("sortOrder") as "asc" | "desc" | null) ?? undefined,
  }, storageRootName);

  return NextResponse.json({ data });
}
