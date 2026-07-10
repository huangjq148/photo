import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { loginSchema } from "@/lib/auth/schemas";
import { loginUser } from "@/lib/users/auth";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { getRateLimitStore, rateLimitKey } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "请求参数无效", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Rate limit check
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const key = rateLimitKey(parsed.data.email, ip);
  const limiter = getRateLimitStore();

  const { blocked, retryAfterMs } = limiter.isBlocked(key);
  if (blocked) {
    return NextResponse.json(
      { error: "登录尝试过于频繁，请稍后再试", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
      }
    );
  }

  try {
    const result = await loginUser(prisma, getAppEnv(), parsed.data);

    // Clear rate limit on success
    limiter.clear(key);

    const response = NextResponse.json({ data: result });

    response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
      secure: process.env.NODE_ENV === "production"
    });

    return response;
  } catch (error) {
    // Record failure
    limiter.recordFailure(key);

    return NextResponse.json(
      { error: "邮箱或密码错误" },
      { status: 401 }
    );
  }
}
