import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { createAdminSessionToken, getAdminSessionCookieName } from "@/lib/auth/admin-session";

loadEnv({ path: resolve(process.cwd(), ".env.test"), override: true });

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=",
  "base64"
);
const e2eJwtSecret = "test-secret-for-e2e-testing-only-32chars";

test.describe.serial("admin smoke", () => {
  const prisma = new PrismaClient();
  const uniqueId = randomUUID().slice(0, 8);
  const adminName = `Admin Smoke ${uniqueId}`;
  const adminEmail = `admin-smoke-${uniqueId}@test.local`;
  const adminPrefix = `admin-smoke-${uniqueId}`;
  const dataRoot = resolve(process.cwd(), "data");
  const storageRoot = resolve(dataRoot, "storage-e2e");
  const originalsDir = resolve(storageRoot, "originals");
  const previewsDir = resolve(storageRoot, "previews");
  const thumbnailsDir = resolve(storageRoot, "thumbnails");
  const imageFileName = `${adminPrefix}.png`;
  const orphanFileRelativePath = `${adminPrefix}/orphan-note.txt`;
  const orphanFileAbsolutePath = resolve(dataRoot, orphanFileRelativePath);

  test.beforeAll(async () => {
    mkdirSync(originalsDir, { recursive: true });
    mkdirSync(previewsDir, { recursive: true });
    mkdirSync(thumbnailsDir, { recursive: true });
    mkdirSync(resolve(dataRoot, adminPrefix), { recursive: true });

    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        password_hash: "hash",
        nickname: adminName,
        session_version: 1,
      },
    });

    const album = await prisma.album.create({
      data: {
        creator_id: user.id,
        name: `${adminName} Album`,
      },
    });

    await prisma.albumMember.create({
      data: {
        album_id: album.id,
        user_id: user.id,
        role: "owner",
      },
    });

    const media = await prisma.media.create({
      data: {
        album_id: album.id,
        uploader_id: user.id,
        display_name: adminName,
        original_name: imageFileName,
        file_name: imageFileName,
        mime_type: "image/png",
        media_type: "image",
        size: BigInt(tinyPng.length),
        width: 1,
        height: 1,
        original_url: `/api/files/originals/${imageFileName}`,
        preview_url: `/api/files/previews/${imageFileName}`,
        thumbnail_url: `/api/files/thumbnails/${imageFileName}`,
        storage_path: imageFileName,
        processing_status: "normal",
        status: "normal",
      },
    });

    await prisma.album.update({
      where: { id: album.id },
      data: { cover_photo_id: media.id },
    });

    await prisma.albumPhoto.create({
      data: {
        album_id: album.id,
        photo_id: media.id,
        added_by: user.id,
      },
    });

    await prisma.favorite.create({
      data: {
        user_id: user.id,
        photo_id: media.id,
      },
    });

    await prisma.photoShare.create({
      data: {
        photo_id: media.id,
        created_by: user.id,
        token: `share-${uniqueId}`,
      },
    });

    writeFileSync(resolve(originalsDir, imageFileName), tinyPng);
    writeFileSync(resolve(previewsDir, imageFileName), tinyPng);
    writeFileSync(resolve(thumbnailsDir, imageFileName), tinyPng);
    writeFileSync(orphanFileAbsolutePath, "orphan admin file");
  });

  test.afterAll(async () => {
    const album = await prisma.album.findFirst({ where: { name: `${adminName} Album` } });
    const media = await prisma.media.findFirst({ where: { original_name: imageFileName } });

    await prisma.photoShare.deleteMany({ where: { token: `share-${uniqueId}` } });
    if (media) {
      await prisma.favorite.deleteMany({ where: { photo_id: media.id } });
      await prisma.albumPhoto.deleteMany({ where: { photo_id: media.id } });
      await prisma.media.deleteMany({ where: { id: media.id } });
    }
    if (album) {
      await prisma.albumMember.deleteMany({ where: { album_id: album.id } });
      await prisma.album.deleteMany({ where: { id: album.id } });
    }
    await prisma.user.deleteMany({ where: { email: adminEmail } });

    rmSync(resolve(dataRoot, adminPrefix), { recursive: true, force: true });
    rmSync(resolve(originalsDir, imageFileName), { force: true });
    rmSync(resolve(previewsDir, imageFileName), { force: true });
    rmSync(resolve(thumbnailsDir, imageFileName), { force: true });
    rmSync(orphanFileAbsolutePath, { force: true });

    await prisma.$disconnect();
  });

  test("logs in, previews a photo, and deletes an orphan file", async ({ page }) => {
    const adminToken = createAdminSessionToken({
      secret: e2eJwtSecret,
    }).token;
    await page.context().addCookies([
      {
        name: getAdminSessionCookieName(),
        value: adminToken,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/admin/photos");
    await expect(page.getByText(adminName)).toBeVisible();

    const photoRow = page.locator("tr").filter({ hasText: adminName });
    await expect(photoRow).toContainText("4");

    await photoRow.getByRole("button", { name: /4\s*查看/ }).click();
    const referenceDialog = page.getByRole("dialog", { name: `${adminName} 的引用` });
    await expect(referenceDialog).toBeVisible();
    await expect(referenceDialog).toContainText("封面");
    await referenceDialog.getByRole("button", { name: /收藏/ }).click();
    await expect(referenceDialog).toContainText("用户邮箱");

    await page.getByLabel("关闭弹框").click();
    await expect(page.getByRole("dialog", { name: `${adminName} 的引用` })).toHaveCount(0);

    await photoRow.getByRole("button", { name: /点击预览大图/ }).click();
    const previewDialog = page.getByRole("dialog", { name: adminName });
    await expect(previewDialog).toBeVisible();
    await expect(previewDialog.locator("img").first()).toHaveAttribute("src", /\/api\/admin\/storage\/previews\//);

    await page.goto(`/admin/files?keyword=${encodeURIComponent(adminPrefix)}`);
    const imageRow = page.locator("tr").filter({ hasText: imageFileName }).first();
    await expect(imageRow).toBeVisible();
    await imageRow.getByRole("button", { name: /4\s*查看/ }).click();
    const fileReferenceDialog = page.getByRole("dialog", { name: `${imageFileName} 的引用` });
    await expect(fileReferenceDialog).toBeVisible();
    await expect(fileReferenceDialog).toContainText("引用来源");
    await fileReferenceDialog.getByRole("button", { name: /收藏/ }).click();
    await expect(fileReferenceDialog).toContainText("用户邮箱");
    await page.getByLabel("关闭弹框").click();

    await page.getByRole("button", { name: `预览 ${imageFileName}` }).first().click();
    const filePreviewDialog = page.getByRole("dialog", { name: imageFileName });
    await expect(filePreviewDialog).toBeVisible();
    await expect(filePreviewDialog.locator("img").first()).toHaveAttribute("src", /\/api\/admin\/storage\//);
    await page.getByLabel("关闭弹框").click();

    const orphanRow = page.locator("tr").filter({ hasText: orphanFileRelativePath });
    await expect(orphanRow).toBeVisible();
    await expect(orphanRow).toContainText("0");
    await expect(orphanRow.getByRole("button", { name: "删除" })).toBeEnabled();

    await orphanRow.getByRole("button", { name: "删除" }).click();
    await expect(page.getByRole("dialog", { name: "永久删除文件" })).toBeVisible();
    await page.getByRole("button", { name: "永久删除" }).click();

    await expect(page.locator("tr").filter({ hasText: orphanFileRelativePath })).toHaveCount(0);
    expect(existsSync(orphanFileAbsolutePath)).toBe(false);
  });
});
