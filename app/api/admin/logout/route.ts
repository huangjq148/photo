import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAppEnv } from "@/lib/config";
import {
  clearAdminSession,
  getAdminSessionFromCookieStore,
  getCurrentAdminSessionFromCookieStore,
  revokeAdminSession,
} from "@/lib/auth/admin-session";

export async function POST(request: NextRequest) {
  const session = getCurrentAdminSessionFromCookieStore(request.cookies, getAppEnv().JWT_SECRET);
  if (!session) {
    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", clearAdminSession());
    return response;
  }

  const token = getAdminSessionFromCookieStore(request.cookies);
  if (token) {
    revokeAdminSession(session.sessionId);
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearAdminSession());
  return response;
}
