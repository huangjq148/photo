import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { serializeSetCookieHeader } from "@/lib/auth/session";

const ADMIN_SESSION_VERSION = 1;
const ADMIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const ADMIN_SESSION_COOKIE_NAME = "photo_admin_session";

type AdminSessionPayload = {
  v: number;
  sid: string;
  iat: number;
  exp: number;
};

type CreateAdminSessionInput = {
  adminPassword?: string;
  secret: string;
  now?: number;
};

type VerifiedAdminSession = {
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
};

const decoder = new TextDecoder();
function sign(value: string, secret: string) {
  return Buffer.from(createHmac("sha256", secret).update(value).digest()).toString("base64url");
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode(value: string) {
  return JSON.parse(decoder.decode(Buffer.from(value, "base64url")));
}

export function getAdminSessionCookieName() {
  return ADMIN_SESSION_COOKIE_NAME;
}

export function createAdminSessionToken({
  adminPassword: _adminPassword,
  secret,
  now = Date.now(),
}: CreateAdminSessionInput) {
  const sessionId = randomUUID();
  const payload: AdminSessionPayload = {
    v: ADMIN_SESSION_VERSION,
    sid: sessionId,
    iat: now,
    exp: now + ADMIN_SESSION_TTL_MS,
  };
  const encoded = encode(payload);
  const signature = sign(encoded, secret);

  return {
    sessionId,
    token: `${encoded}.${signature}`,
    expiresAt: payload.exp,
  };
}

export function verifyAdminSessionToken(
  token: string,
  secret: string,
  now = Date.now()
): VerifiedAdminSession {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    throw new Error("无效的管理员会话");
  }

  const expected = sign(encoded, secret);
  const actualBytes = Buffer.from(signature, "base64url");
  const expectedBytes = Buffer.from(expected, "base64url");

  if (
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  ) {
    throw new Error("无效的管理员会话");
  }

  const payload = decode(encoded) as Partial<AdminSessionPayload>;

  if (
    payload.v !== ADMIN_SESSION_VERSION ||
    typeof payload.sid !== "string" ||
    !payload.sid ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("无效的管理员会话");
  }

  if (payload.exp <= now) {
    throw new Error("管理员会话已过期");
  }

  return {
    sessionId: payload.sid,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
  };
}

export function registerAdminSession(sessionId: string) {
  void sessionId;
}

export function revokeAdminSession(sessionId: string) {
  void sessionId;
}

export function isAdminSessionTokenValid(
  token: string,
  secret: string,
  now = Date.now()
) {
  try {
    verifyAdminSessionToken(token, secret, now);
    return true;
  } catch {
    return false;
  }
}

export function clearAdminSession() {
  return serializeSetCookieHeader(ADMIN_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
}

export function createAdminSessionCookie(token: string) {
  return serializeSetCookieHeader(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
    secure: process.env.NODE_ENV === "production",
  });
}

export function getAdminSessionFromCookieStore(cookieStore: {
  get(name: string): { value: string } | undefined;
}) {
  return cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value ?? null;
}

export function getCurrentAdminSessionFromCookieStore(
  cookieStore: {
    get(name: string): { value: string } | undefined;
  },
  secret: string
) {
  const token = getAdminSessionFromCookieStore(cookieStore);
  if (!token) {
    return null;
  }

  if (!isAdminSessionTokenValid(token, secret)) {
    return null;
  }

  return verifyAdminSessionToken(token, secret);
}
