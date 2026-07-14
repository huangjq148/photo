import { config as loadEnv } from "dotenv";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { uploadPhotoToAlbum } from "@/lib/photos/upload";

loadEnv({ path: resolve(process.cwd(), ".env.test"), override: true });

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64",
);
const e2eJwtSecret = "test-secret-for-e2e-testing-only-32chars";

test.describe.serial("photo ux p1", () => {
  const prisma = new PrismaClient();
  const uniqueId = randomUUID().slice(0, 8);
  const email = `photo-ux-p1-${uniqueId}@test.local`;
  const nickname = `Photo UX ${uniqueId}`;
  const storageRoot = resolve(process.cwd(), "data", "storage-e2e");

  let userId = "";
  let albumId = "";
  let ownerPhotoId = "";
  let collaboratorPhotoId = "";
  let ownerPhotoName = "";
  let collaboratorPhotoName = "";

  test.beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: "hash",
        nickname,
        session_version: 1,
      },
    });

    const collaborator = await prisma.user.create({
      data: {
        email: `photo-ux-p1-collab-${uniqueId}@test.local`,
        password_hash: "hash",
        nickname: `Photo UX Collab ${uniqueId}`,
        session_version: 1,
      },
    });

    const album = await prisma.album.create({
      data: {
        creator_id: user.id,
        name: `P1 Album ${uniqueId}`,
      },
    });

    await prisma.albumMember.createMany({
      data: [
        { album_id: album.id, user_id: user.id, role: "owner" },
        { album_id: album.id, user_id: collaborator.id, role: "member", can_upload: true, can_delete: false },
      ],
    });

    const ownerUpload = await uploadPhotoToAlbum(
      prisma,
      { storageRoot, jwtSecret: e2eJwtSecret },
      {
        albumId: album.id,
        userId: user.id,
        file: new File([tinyPng], "p1-owner-a.png", { type: "image/png" }),
      },
    );

    const collaboratorUpload = await uploadPhotoToAlbum(
      prisma,
      { storageRoot, jwtSecret: e2eJwtSecret },
      {
        albumId: album.id,
        userId: collaborator.id,
        file: new File([tinyPng], "p1-collaborator-b.png", { type: "image/png" }),
      },
    );

    userId = user.id;
    albumId = album.id;
    ownerPhotoId = ownerUpload.id;
    collaboratorPhotoId = collaboratorUpload.id;
    ownerPhotoName = "p1-owner-a";
    collaboratorPhotoName = "p1-collaborator-b";
  });

  test.afterAll(async () => {
    if (collaboratorPhotoId) {
      await prisma.albumPhoto.deleteMany({ where: { photo_id: collaboratorPhotoId } });
      await prisma.media.deleteMany({ where: { id: collaboratorPhotoId } });
    }
    if (ownerPhotoId) {
      await prisma.albumPhoto.deleteMany({ where: { photo_id: ownerPhotoId } });
      await prisma.media.deleteMany({ where: { id: ownerPhotoId } });
    }

    const album = albumId ? await prisma.album.findUnique({ where: { id: albumId } }) : null;
    if (album) {
      await prisma.albumMember.deleteMany({ where: { album_id: album.id } });
      await prisma.album.deleteMany({ where: { id: album.id } });
    }

    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }

    await prisma.$disconnect();
  });

  async function openAlbum(page: Page) {
    const token = createSessionToken(userId, 1, e2eJwtSecret);
    await page.context().addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: token,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto(`/albums/${albumId}`);
    await expect(page.getByRole("heading", { name: /P1 Album/ })).toBeVisible();
  }

  async function openTimeline(page: Page) {
    const token = createSessionToken(userId, 1, e2eJwtSecret);
    await page.context().addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: token,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/timeline");
    await expect(page.getByRole("heading", { name: /时间线/ })).toBeVisible();
  }

  test("uploads with retry, keeps preferences after refresh, and preserves modal close protection", async ({
    page,
  }) => {
    await openAlbum(page);

    await page.getByRole("button", { name: "上传新照片" }).click();
    const uploadDialog = page.getByRole("dialog", { name: "上传照片" });
    await expect(uploadDialog).toBeVisible();

    let failedOnce = false;
    await page.route(`**/api/albums/${albumId}/photos/upload`, async (route) => {
      if (!failedOnce) {
        failedOnce = true;
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ code: "UPLOAD_FAILED", error: "模拟上传失败" }),
        });
        return;
      }

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: { id: `upload-${Date.now()}` } }),
      });
    });

    await uploadDialog.locator('input[type="file"]').setInputFiles([
      { name: "p1-upload-1.png", mimeType: "image/png", buffer: tinyPng },
      { name: "p1-upload-2.png", mimeType: "image/png", buffer: tinyPng },
      { name: "p1-upload-3.png", mimeType: "image/png", buffer: tinyPng },
    ]);

    await expect(uploadDialog.getByText("p1-upload-1")).toBeVisible();
    await expect(uploadDialog.getByText("p1-upload-2")).toBeVisible();
    await expect(uploadDialog.getByText("p1-upload-3")).toBeVisible();
    await expect(uploadDialog.getByRole("button", { name: "重试全部失败" })).toBeVisible();
    await expect(uploadDialog.getByText("模拟上传失败")).toBeVisible();

    await uploadDialog.getByRole("button", { name: "重试全部失败" }).click();
    await expect(uploadDialog.getByRole("button", { name: "重试全部失败" })).toHaveCount(0, {
      timeout: 20_000,
    });
  });

  test("persists gallery preferences after refresh", async ({ page }) => {
    await openAlbum(page);

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.locator('button[title="更多操作"]').first().click();
    const controlsDialog = page.getByRole("dialog", { name: "照片操作" });
    await expect(controlsDialog).toBeVisible();
    await controlsDialog.getByRole("button", { name: "大" }).click();
    await page.getByLabel("关闭弹框").click();

    await page.reload();
    await expect(page.getByRole("heading", { name: /P1 Album/ })).toBeVisible();

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.locator('button[title="更多操作"]').first().click();
    await expect(page.getByRole("dialog", { name: "照片操作" })).toContainText("当前偏好");
    await expect(page.getByRole("dialog", { name: "照片操作" })).toContainText("large");
  });

  test("blocks closing an active upload dialog until the confirmation is handled", async ({ page }) => {
    await openAlbum(page);

    await page.getByRole("button", { name: "上传新照片" }).click();
    const uploadDialog = page.getByRole("dialog", { name: "上传照片" });
    await expect(uploadDialog).toBeVisible();

    let releaseUpload: (() => void) | null = null;
    const uploadGate = new Promise<void>((resolve) => {
      releaseUpload = resolve;
    });
    await page.route(`**/api/albums/${albumId}/photos/upload`, async (route) => {
      await uploadGate;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: { id: `upload-${Date.now()}` } }),
      });
    });

    await uploadDialog.locator('input[type="file"]').setInputFiles([
      { name: "pending-upload.png", mimeType: "image/png", buffer: tinyPng },
    ]);
    await expect(uploadDialog.getByText("pending-upload")).toBeVisible();

    let confirmMessage = "";
    page.once("dialog", async (confirm) => {
      confirmMessage = confirm.message();
      await confirm.dismiss();
      releaseUpload?.();
    });

    await uploadDialog.getByRole("button", { name: "关闭弹框" }).click({ force: true });
    expect(confirmMessage).toContain("关闭后会取消正在上传的项目");
    await expect(uploadDialog).toBeVisible();
  });

  test("handles batch partial failures and undoing a removal", async ({ page }) => {
    await openTimeline(page);

    await page.getByLabel(`选择 ${ownerPhotoName}`).check();
    await page.getByLabel(`选择 ${collaboratorPhotoName}`).check();

    await page.getByRole("button", { name: "移入回收站" }).click();
    await expect(page.getByText("已选择 1 项")).toBeVisible();

    await openAlbum(page);

    const collaboratorCard = page.locator("article").filter({ hasText: collaboratorPhotoName }).first();
    await collaboratorCard.getByRole("button", { name: "更多操作" }).click();
    await collaboratorCard.getByRole("menuitem", { name: "从相册移除" }).click();

    await expect(page.getByText("已从相册移除")).toBeVisible();
    await page.getByRole("button", { name: "撤销" }).click();
    await expect(page.getByRole("button", { name: `选择 ${collaboratorPhotoName}` }).first()).toBeVisible();
  });

  test("supports modal keyboard close from the management dialog", async ({ page }) => {
    await openAlbum(page);

    await page.getByRole("button", { name: "管理" }).click();
    const managementDialog = page.getByRole("dialog", { name: "管理相册" });
    await expect(managementDialog).toBeVisible();
    await expect(page.getByLabel("关闭弹框")).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(managementDialog).toHaveCount(0);
  });
});
