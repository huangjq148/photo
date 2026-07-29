import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentAdminSessionFromCookieStore } from "@/lib/auth/admin-session";
import { getAppEnv } from "@/lib/config";
import { listAdminUsers } from "@/lib/admin/users";

export async function GET(request: NextRequest) {
  const session = getCurrentAdminSessionFromCookieStore(request.cookies, getAppEnv().JWT_SECRET);
  if (!session) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const data = await listAdminUsers(prisma, {
    keyword: url.searchParams.get("keyword") ?? undefined,
    page: Number(url.searchParams.get("page") ?? "1"),
    pageSize: Number(url.searchParams.get("pageSize") ?? "20"),
    sortBy: (url.searchParams.get("sortBy") as "createdAt" | "storageUsed" | "uploads" | null) ?? undefined,
    sortOrder: (url.searchParams.get("sortOrder") as "asc" | "desc" | null) ?? undefined,
  });

  return NextResponse.json({ data });
}
