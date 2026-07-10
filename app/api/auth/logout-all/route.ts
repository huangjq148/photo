import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { logoutAllDevices } from "@/lib/users/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    await logoutAllDevices(prisma, getAppEnv(), user.id);

    const response = NextResponse.json({ data: { success: true } });

    // Clear the current cookie
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "退出失败", code: "LOGOUT_FAILED" },
      { status: 400 }
    );
  }
}
