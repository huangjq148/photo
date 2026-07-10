import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { hashPassword } from "@/lib/auth/password";
import { loginUser } from "@/lib/users/auth";

const TEST_ENV = { JWT_SECRET: "test-secret-that-is-at-least-32-chars" };

function prismaWithUser(user: Awaited<ReturnType<PrismaClient["user"]["findUnique"]>>) {
  return {
    user: {
      findUnique: vi.fn().mockResolvedValue(user),
    },
  } as unknown as PrismaClient;
}

const invalidCredentials = {
  name: "AppError",
  code: "INVALID_CREDENTIALS",
  status: 401,
  message: "邮箱或密码错误",
};

describe("loginUser", () => {
  it("returns the same invalid-credentials error when the user does not exist", async () => {
    const prisma = prismaWithUser(null);

    await expect(
      loginUser(prisma, TEST_ENV, {
        email: "missing-user@example.com",
        password: "ValidPassword123!",
      })
    ).rejects.toMatchObject(invalidCredentials);
  });

  it("returns the same invalid-credentials error when the password is wrong", async () => {
    const passwordHash = await hashPassword("CorrectPassword123!");
    const prisma = prismaWithUser({
      id: "11111111-1111-4111-8111-111111111111",
      email: "wrong-password@example.com",
      password_hash: passwordHash,
      nickname: "Test User",
      avatar_url: null,
      storage_limit: 10_737_418_240n,
      storage_used: 1_024n,
      session_version: 1,
      created_at: new Date("2026-01-01T00:00:00.000Z"),
      updated_at: new Date("2026-01-01T00:00:00.000Z"),
    });

    await expect(
      loginUser(prisma, TEST_ENV, {
        email: "wrong-password@example.com",
        password: "WrongPassword123!",
      })
    ).rejects.toMatchObject(invalidCredentials);
  });
});
