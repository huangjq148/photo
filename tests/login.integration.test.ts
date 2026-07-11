import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { POST } from "@/app/api/auth/login/route";
import { hashPassword } from "@/lib/auth/password";

describe("POST /api/auth/login", () => {
  const prisma = new PrismaClient();
  const password = "CorrectPassword123!";
  const email = `login-${randomUUID()}@test.local`;
  let userId: string | undefined;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: await hashPassword(password),
        nickname: "Login Integration User",
        session_version: 1,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({ where: { email } });
    } finally {
      await prisma.$disconnect();
    }
  });

  it("logs in through the production route and sets the session cookie", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(userId);
    expect(response.headers.get("set-cookie")).toContain("photo_session=");
  });
});
