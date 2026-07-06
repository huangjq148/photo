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
    return null;
  }

  let session;
  try {
    session = verifySessionToken(token, getAppEnv().JWT_SECRET);
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
    storageLimit: user.storage_limit.toString(),
    storageUsed: user.storage_used.toString()
  };
}
