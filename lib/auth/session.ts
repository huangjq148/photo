import { createHmac, timingSafeEqual } from "node:crypto";

const CURRENT_VERSION = 1;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type SessionPayload = {
  /** Protocol version — must equal CURRENT_VERSION */
  v: number;
  /** User ID */
  uid: string;
  /** User's session_version from the database */
  sv: number;
  /** Issued-at timestamp in ms */
  iat: number;
  /** Expiration timestamp in ms */
  exp: number;
};

type VerifiedSession = {
  userId: string;
  sessionVersion: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64urlEncode(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function base64urlDecode(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

function sign(value: string, secret: string): string {
  return base64urlEncode(createHmac("sha256", secret).update(value).digest());
}

export function createSessionToken(
  userId: string,
  sessionVersion: number,
  secret: string,
  now: number = Date.now()
): string {
  const payload: SessionPayload = {
    v: CURRENT_VERSION,
    uid: userId,
    sv: sessionVersion,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const encoded = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = sign(encoded, secret);

  return `${encoded}.${signature}`;
}

export function verifySessionToken(
  token: string,
  expectedSessionVersion: number,
  secret: string,
  now: number = Date.now()
): VerifiedSession {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new Error("Invalid session token");
  }

  const [encoded, signature] = parts;

  if (!encoded || !signature) {
    throw new Error("Invalid session token");
  }

  // Verify HMAC signature
  const expected = sign(encoded, secret);
  const actualBytes = base64urlDecode(signature);
  const expectedBytes = base64urlDecode(expected);

  if (
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  ) {
    throw new Error("Invalid session token");
  }

  // Parse and validate payload
  let payload: unknown;
  try {
    payload = JSON.parse(decoder.decode(base64urlDecode(encoded)));
  } catch {
    throw new Error("Invalid session token");
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("v" in payload) ||
    !("uid" in payload) ||
    !("sv" in payload) ||
    !("iat" in payload) ||
    !("exp" in payload)
  ) {
    throw new Error("Invalid session token");
  }

  const p = payload as Record<string, unknown>;

  if (typeof p.v !== "number" || p.v !== CURRENT_VERSION) {
    throw new Error("Invalid session token");
  }
  if (typeof p.uid !== "string" || !p.uid) {
    throw new Error("Invalid session token");
  }
  if (typeof p.sv !== "number") {
    throw new Error("Invalid session token");
  }
  if (typeof p.exp !== "number" || p.exp <= now) {
    throw new Error("Session 已过期");
  }

  // Check session version matches (0 means skip version check)
  if (expectedSessionVersion > 0 && p.sv !== expectedSessionVersion) {
    throw new Error("Session 版本不匹配，请重新登录");
  }

  return {
    userId: p.uid as string,
    sessionVersion: p.sv as number,
  };
}

export const SESSION_COOKIE_NAME = "photo_session";
export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
