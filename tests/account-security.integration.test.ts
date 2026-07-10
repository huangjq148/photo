import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";
import { changePassword, logoutAllDevices } from "@/lib/users/auth";

const TEST_SECRET = "x".repeat(32);

describe("account security", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "account-sec-"));
  let prisma: PrismaClient;

  beforeAll(() => {
    process.env.STORAGE_ROOT = storageRoot;
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    rmSync(storageRoot, { recursive: true, force: true });
  });

  async function createUser(email: string, password: string) {
    const hash = await hashPassword(password);
    return prisma.user.create({
      data: { email, password_hash: hash, nickname: "TestUser", session_version: 1 },
    });
  }

  it("changes password and returns new session token", async () => {
    const user = await createUser(`cp-${Date.now()}@test.local`, "OldPass1");
    const oldToken = createSessionToken(user.id, 1, TEST_SECRET);

    const result = await changePassword(prisma, { JWT_SECRET: TEST_SECRET }, {
      userId: user.id,
      currentPassword: "OldPass1",
      newPassword: "NewPass2",
    });

    expect(result.sessionToken).toBeTruthy();
    expect(result.sessionToken).not.toBe(oldToken);

    // Old token should fail with new session version
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.session_version).toBe(2);

    // Old token with old version should fail
    expect(() => verifySessionToken(oldToken, updated!.session_version, TEST_SECRET)).toThrow();
  });

  it("old session token fails after password change", async () => {
    const user = await createUser(`cp2-${Date.now()}@test.local`, "OldPass1");
    const oldToken = createSessionToken(user.id, 1, TEST_SECRET);

    await changePassword(prisma, { JWT_SECRET: TEST_SECRET }, {
      userId: user.id,
      currentPassword: "OldPass1",
      newPassword: "NewPass2",
    });

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.session_version).toBe(2);

    // Old token should reject
    expect(() => verifySessionToken(oldToken, updated!.session_version, TEST_SECRET)).toThrow(/版本不匹配/);
  });

  it("rejects wrong current password", async () => {
    const user = await createUser(`cp3-${Date.now()}@test.local`, "Correct1");

    await expect(
      changePassword(prisma, { JWT_SECRET: TEST_SECRET }, {
        userId: user.id,
        currentPassword: "WrongPass",
        newPassword: "NewPass2",
      })
    ).rejects.toThrow(/当前密码错误/);
  });

  it("rejects same password", async () => {
    const user = await createUser(`cp4-${Date.now()}@test.local`, "SamePass1");

    await expect(
      changePassword(prisma, { JWT_SECRET: TEST_SECRET }, {
        userId: user.id,
        currentPassword: "SamePass1",
        newPassword: "SamePass1",
      })
    ).rejects.toThrow(/相同/);
  });

  it("logout all devices increments session version", async () => {
    const user = await createUser(`lo-${Date.now()}@test.local`, "Pass123");
    const oldToken = createSessionToken(user.id, 1, TEST_SECRET);

    await logoutAllDevices(prisma, { JWT_SECRET: TEST_SECRET }, user.id);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.session_version).toBe(2);

    // Old token fails
    expect(() => verifySessionToken(oldToken, updated!.session_version, TEST_SECRET)).toThrow(/版本不匹配/);
  });

  it("logout all devices can be called multiple times", async () => {
    const user = await createUser(`lo2-${Date.now()}@test.local`, "Pass123");

    await logoutAllDevices(prisma, { JWT_SECRET: TEST_SECRET }, user.id);
    await logoutAllDevices(prisma, { JWT_SECRET: TEST_SECRET }, user.id);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.session_version).toBe(3);
  });
});
