import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

type CookieStore = {
  get(name: string): { value: string } | undefined;
};

export async function getCurrentUserFromRequest(request: NextRequest) {
  return getCurrentUserFromCookieStore(request.cookies);
}

export async function getCurrentUserFromCookieStore(cookieStore: CookieStore) {
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    console.log("[auth] no photo_session cookie found");
    return null;
  }

  console.log("[auth] cookie found, token length:", token.length);

  let session;
  try {
    // First, verify the token with a dummy version to extract userId
    session = verifySessionToken(token, 0, getAppEnv().JWT_SECRET);
    console.log("[auth] first verify OK, userId:", session.userId, "sv:", session.sessionVersion);
  } catch (e) {
    console.log("[auth] first verify FAILED:", e instanceof Error ? e.message : e);
    // Debug: try to decode token manually
    try {
      const parts = token.split(".");
      console.log("[auth] token parts count:", parts.length);
      if (parts.length === 2 && parts[0]) {
        const decoded = Buffer.from(parts[0], "base64url").toString("utf-8");
        console.log("[auth] decoded payload:", decoded);
      }
    } catch (debugErr) {
      console.log("[auth] manual decode failed:", debugErr);
    }
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user) {
    console.log("[auth] user not found in DB:", session.userId);
    return null;
  }

  console.log("[auth] user found, db session_version:", user.session_version);

  // Re-verify with the actual session_version from DB
  try {
    verifySessionToken(token, user.session_version, getAppEnv().JWT_SECRET);
    console.log("[auth] second verify OK");
  } catch (e) {
    console.log("[auth] second verify FAILED:", e instanceof Error ? e.message : e);
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
    storageLimit: user.storage_limit.toString(),
    storageUsed: user.storage_used.toString(),
    sessionVersion: user.session_version,
  };
};
