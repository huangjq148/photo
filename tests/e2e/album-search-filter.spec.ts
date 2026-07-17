import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
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

test.describe.serial("album search and filter e2e", () => {
  const prisma = new PrismaClient();
  const uniqueId = randomUUID().slice(0, 8);
  const email = `album-search-${uniqueId}@test.local`;
  const nickname = `Album Search ${uniqueId}`;
  const storageRoot = resolve(process.cwd(), "data", "storage-e2e");

  let userId = "";
  let albumId = "";
  let imagePhotoId = "";
  let videoPhotoId = "";

  test.beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: "hash",
        nickname,
        session_version: 1,
      },
    });

    const album = await prisma.album.create({
      data: {
        creator_id: user.id,
        name: `Search Album ${uniqueId}`,
      },
    });

    await prisma.albumMember.create({
      data: {
        album_id: album.id,
        user_id: user.id,
        role: "owner",
      },
    });

    const imageUpload = await uploadPhotoToAlbum(
      prisma,
      { storageRoot, jwtSecret: e2eJwtSecret },
      {
        albumId: album.id,
        userId: user.id,
        file: new File([tinyPng], "beach-day.png", { type: "image/png" }),
      },
    );

    const videoUpload = await uploadPhotoToAlbum(
      prisma,
      { storageRoot, jwtSecret: e2eJwtSecret },
      {
        albumId: album.id,
        userId: user.id,
        file: new File([tinyPng], "city-walk.png", { type: "image/png" }),
      },
    );

    await prisma.media.update({
      where: { id: imageUpload.id },
      data: {
        display_name: "海边合影",
        taken_at: new Date("2026-07-12T08:30:00.000Z"),
      },
    });
    await prisma.media.update({
      where: { id: videoUpload.id },
      data: {
        display_name: "城市漫步",
        taken_at: new Date("2026-07-10T08:30:00.000Z"),
      },
    });

    await prisma.favorite.create({
      data: {
        user_id: user.id,
        photo_id: imageUpload.id,
      },
    });

    userId = user.id;
    albumId = album.id;
    imagePhotoId = imageUpload.id;
    videoPhotoId = videoUpload.id;
  });

  test.afterAll(async () => {
    if (imagePhotoId) {
      await prisma.albumPhoto.deleteMany({ where: { photo_id: imagePhotoId } });
      await prisma.media.deleteMany({ where: { id: imagePhotoId } });
    }
    if (videoPhotoId) {
      await prisma.albumPhoto.deleteMany({ where: { photo_id: videoPhotoId } });
      await prisma.media.deleteMany({ where: { id: videoPhotoId } });
    }

    if (albumId) {
      await prisma.albumMember.deleteMany({ where: { album_id: albumId } });
      await prisma.album.deleteMany({ where: { id: albumId } });
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
    await expect(page.getByRole("heading", { name: /Search Album/ })).toBeVisible();
  }

  test("searches by display name and applies filters", async ({ page }) => {
    test.setTimeout(120_000);

    await openAlbum(page);
    const filterToggle = page.getByRole("button", { name: /^筛选(?: \d+)?$/ }).first();
    const clearFiltersButton = page.getByRole("button", {
      name: /^(清空条件|清除所有筛选)$/,
    }).first();
    const desktopSearch = page.locator('div.hidden.sm\\:block input[placeholder="搜索名称或原始文件名"]');

    await desktopSearch.fill("海边");
    await expect(page.getByText("海边合影")).toBeVisible();
    await expect(page.getByText("城市漫步")).toHaveCount(0);

    await desktopSearch.fill("");
    await expect(page).not.toHaveURL(/q=%E6%B5%B7%E8%BE%B9/);
    await filterToggle.click();
    const filterPanel = page.locator("#gallery-filter-panel");
    await Promise.all([
      page.waitForURL(/mediaType=video/),
      filterPanel.getByRole("button", { name: "视频" }).click(),
    ]);
    await expect(page.getByText("城市漫步")).toBeVisible();
    await expect(page.getByText("海边合影")).toHaveCount(0);

    await clearFiltersButton.click();
    await Promise.all([
      page.waitForURL(/favoritedOnly=1/),
      filterPanel.getByRole("button", { name: "仅收藏" }).click(),
    ]);
    await expect(page.getByText("海边合影")).toBeVisible();
    await expect(page.getByText("城市漫步")).toHaveCount(0);

    await clearFiltersButton.click();
    await filterPanel.getByLabel("起始日期").click();
    await page.locator('.photo-date-picker-popup').getByRole("cell", { name: "12" }).first().click();
    await filterPanel.getByLabel("结束日期").click();
    await page.locator('.photo-date-picker-popup').getByRole("cell", { name: "12" }).first().click();
    await expect(page.getByText("海边合影")).toBeVisible();
    await expect(page.getByText("城市漫步")).toHaveCount(0);
  });
});
