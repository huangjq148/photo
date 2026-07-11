import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";
import { changePassword } from "@/lib/users/auth";
import { serializeSetCookieHeader } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "请先登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "请填写所有密码字段", code: "MISSING_FIELDS" },
        { status: 422 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "两次输入的新密码不一致", code: "PASSWORD_MISMATCH" },
        { status: 422 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "新密码长度必须至少为 8 个字符", code: "WEAK_PASSWORD" },
        { status: 422 }
      );
    }

    const result = await changePassword(prisma, getAppEnv(), {
      userId: user.id,
      currentPassword,
      newPassword,
    });

    const response = NextResponse.json({ data: { success: true } });

    // Set new cookie with updated session version
    response.headers.set(
      "Set-Cookie",
      serializeSetCookieHeader(result.cookieName, result.sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: result.maxAge,
        secure: process.env.NODE_ENV === "production",
      })
    );

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "修改密码失败";
    const code = message.includes("当前密码") ? "WRONG_PASSWORD"
      : message.includes("相同") ? "SAME_PASSWORD" : "CHANGE_FAILED";
    const status = code === "WRONG_PASSWORD" ? 403 : 400;
    return NextResponse.json({ error: message, code }, { status });
  }
}
