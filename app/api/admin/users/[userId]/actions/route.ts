import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getCurrentAdminSessionFromCookieStore } from "@/lib/auth/admin-session";
import { getAppEnv } from "@/lib/config";
import { hashPassword } from "@/lib/auth/password";

function unauthorized(request: NextRequest) {
  return !getCurrentAdminSessionFromCookieStore(request.cookies, getAppEnv().JWT_SECRET);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  if (unauthorized(request)) return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  const { userId } = await params;
  const temporaryPassword = randomBytes(9).toString("base64url");
  const result = await prisma.user.updateMany({
    where: { id: userId },
    data: { password_hash: await hashPassword(temporaryPassword), session_version: { increment: 1 } },
  });
  if (result.count === 0) return NextResponse.json({ error: "用户不存在", code: "USER_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ data: { userId, temporaryPassword } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  if (unauthorized(request)) return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  const { userId } = await params;
  const result = await prisma.user.deleteMany({ where: { id: userId } });
  if (result.count === 0) return NextResponse.json({ error: "用户不存在", code: "USER_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ data: { userId } });
}
