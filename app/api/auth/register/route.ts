import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { registerSchema } from "@/lib/auth/schemas";
import { registerUser } from "@/lib/users/auth";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, serializeSetCookieHeader } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "请求参数无效", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await registerUser(prisma, getAppEnv(), parsed.data);
    const response = NextResponse.json({ data: { user: result.user, album: result.album } }, { status: 201 });

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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Registration failed"
      },
      { status: 400 }
    );
  }
}
