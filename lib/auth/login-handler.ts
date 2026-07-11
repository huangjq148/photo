import { NextResponse } from "next/server";
import { AppError } from "@/lib/api/errors";
import type { RateLimitStore } from "@/lib/auth/rate-limit";
import { rateLimitKey } from "@/lib/auth/rate-limit";
import { loginSchema } from "@/lib/auth/schemas";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, serializeSetCookieHeader } from "@/lib/auth/session";

type LoginInput = {
  email: string;
  password: string;
};

type LoginResult = {
  user: {
    id: string;
    email: string;
    nickname: string;
    avatarUrl: string | null;
    storageLimit: string;
    storageUsed: string;
  };
  sessionToken: string;
  cookieName: string;
};

type LoginHandlerDependencies = {
  login(input: LoginInput): Promise<LoginResult>;
  rateLimitStore: RateLimitStore;
  logger: Pick<Console, "error">;
};

export function createLoginHandler({
  login,
  rateLimitStore,
  logger,
}: LoginHandlerDependencies) {
  return async function loginHandler(request: Request) {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求参数无效", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "127.0.0.1";
    const key = rateLimitKey(parsed.data.email, ip);
    const { blocked, retryAfterMs } = rateLimitStore.isBlocked(key);

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
      const result = await login(parsed.data);
      rateLimitStore.clear(key);

      const response = NextResponse.json({ data: result.user });
      response.headers.set(
        "Set-Cookie",
        serializeSetCookieHeader(SESSION_COOKIE_NAME, result.sessionToken, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: SESSION_MAX_AGE_SECONDS,
          secure: process.env.NODE_ENV === "production",
        })
      );

      return response;
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === "INVALID_CREDENTIALS"
      ) {
        rateLimitStore.recordFailure(key);
        return NextResponse.json(
          { error: "邮箱或密码错误", code: "INVALID_CREDENTIALS" },
          { status: 401 }
        );
      }

      logger.error("Login failed", error);
      return NextResponse.json(
        { error: "登录服务暂时不可用，请稍后再试", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }
  };
}
