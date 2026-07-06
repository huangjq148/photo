import { createHmac, timingSafeEqual } from "node:crypto";

type SessionPayload = {
  userId: string;
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

export function createSessionToken(userId: string, secret: string): string {
  const payload: SessionPayload = { userId };
  const encoded = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = sign(encoded, secret);

  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string, secret: string): SessionPayload {
  const [encoded, signature] = token.split(".");

  if (!encoded || !signature) {
    throw new Error("Invalid session token");
  }

  const expected = sign(encoded, secret);
  const actualBytes = base64urlDecode(signature);
  const expectedBytes = base64urlDecode(expected);

  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    throw new Error("Invalid session token");
  }

  const payload = JSON.parse(decoder.decode(base64urlDecode(encoded))) as SessionPayload;

  if (!payload.userId) {
    throw new Error("Invalid session token");
  }

  return payload;
}

export const SESSION_COOKIE_NAME = "photo_session";
