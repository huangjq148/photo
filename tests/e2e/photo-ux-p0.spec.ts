import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { getStorageLayout } from "@/lib/storage/paths";

loadEnv({ path: "./.env.test", override: true });

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx2kAAAAASUVORK5CYII=";
const tinyPng = Buffer.from(tinyPngBase64, "base64");

async function registerUser(page: Page, nickname: string, email: string, password: string) {
  await page.goto("/register");
  await page.fill("#register-nickname", nickname);
  await page.fill("#register-email", email);
  await page.fill("#register-password", password);
  await page.fill("#register-confirmPassword", password);

  const navigation = page.waitForURL("**/albums", {
    timeout: 20_000,
    waitUntil: "commit",
  });
  await page.click('button[type="submit"]');
  await navigation;
}

async function seedUploadAlbums(email: string, targetName: string) {
  const prisma = new PrismaClient();
  const storageRoot = "./data/storage-e2e";
  const layout = getStorageLayout(storageRoot);
  mkdirSync(layout.originals, { recursive: true });
  mkdirSync(layout.previews, { recursive: true });
  mkdirSync(layout.thumbnails, { recursive: true });

  try {
    const currentUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!currentUser) {
      throw new Error("未找到注册用户");
    }

    const defaultAlbum = await prisma.album.findFirst({
      where: { creator_id: currentUser.id, is_default: true },
      orderBy: { created_at: "asc" },
    });

    if (!defaultAlbum) {
      throw new Error("未找到默认相册");
    }

    const targetAlbum = await prisma.album.create({
      data: {
        creator_id: currentUser.id,
        name: targetName,
      },
    });

    await prisma.albumMember.create({
      data: {
        album_id: targetAlbum.id,
        user_id: currentUser.id,
        role: "owner",
      },
    });

    const baseTime = Date.now() - 51_000;

    for (let index = 1; index <= 51; index += 1) {
      const timestamp = new Date(baseTime + (51 - index) * 1000);
      const storedId = `p0-${String(index).padStart(2, "0")}-${randomUUID().slice(0, 8)}`;
      const fileName = `${storedId}.png`;

      writeFileSync(join(layout.originals, fileName), tinyPng);
      writeFileSync(join(layout.previews, fileName), tinyPng);
      writeFileSync(join(layout.thumbnails, fileName), tinyPng);

      const media = await prisma.media.create({
        data: {
          album_id: defaultAlbum.id,
          uploader_id: currentUser.id,
          original_name: `photo-${String(index).padStart(2, "0")}.png`,
          file_name: fileName,
          mime_type: "image/png",
          media_type: "image",
          size: BigInt(tinyPng.length),
          width: 1,
          height: 1,
          original_url: `/api/files/originals/${fileName}`,
          preview_url: `/api/files/previews/${fileName}`,
          thumbnail_url: `/api/files/thumbnails/${fileName}`,
          storage_path: fileName,
          processing_status: "normal",
          status: "normal",
          uploaded_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
        },
      });

      await prisma.albumPhoto.create({
        data: {
          album_id: defaultAlbum.id,
          photo_id: media.id,
          added_by: currentUser.id,
          added_at: timestamp,
        },
      });
    }

    return { targetAlbumId: targetAlbum.id as string };
  } finally {
    await prisma.$disconnect();
  }
}

test.describe.serial("photo UX P0", () => {
  test("keeps the primary photo workflows discoverable and keyboard accessible", async ({ page }) => {
    test.setTimeout(240_000);

    const uniqueId = randomUUID().slice(0, 8);
    const email = `photo-ux-p0-${uniqueId}@test.local`;
    const password = "Test1234!";
    const nickname = `PhotoUxP0-${uniqueId}`;
    const targetAlbumName = `P0 验收 ${uniqueId}`;

    await registerUser(page, nickname, email, password);
    const { targetAlbumId } = await seedUploadAlbums(email, targetAlbumName);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "上传照片" })).toBeVisible();
    await page.getByRole("button", { name: "上传照片" }).click();
    await expect(page.getByRole("dialog", { name: "上传照片" })).toBeVisible();
    await page.getByLabel("关闭弹框").click();

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/albums");
    await expect(page.getByRole("button", { name: "上传" })).toBeVisible();
    await page.getByRole("button", { name: "上传" }).click();
    await expect(page.getByRole("dialog", { name: "上传照片" })).toBeVisible();
    await page.getByLabel("关闭弹框").click();

    await page.goto(`/albums/${targetAlbumId}`);
    await expect(page.getByRole("heading", { name: targetAlbumName })).toBeVisible();

    await page.getByRole("button", { name: "从全部照片添加" }).click();
    const addDialog = page.getByRole("dialog", { name: "从全部照片中添加" });
    await expect(addDialog).toBeVisible();

    const addSearch = page.getByPlaceholder("搜索全部照片");
    await addSearch.fill("no-match-" + uniqueId);
    await expect(addDialog.getByText("全部照片中暂无可添加的照片")).toBeVisible();
    await addDialog.getByLabel("清空搜索").click();
    await expect(addSearch).toHaveValue("");

    const loadMoreButton = page.getByRole("button", { name: "加载更多" });
    await expect(loadMoreButton).toBeEnabled();
    await loadMoreButton.press("Enter");
    await expect(addDialog.getByText("photo-25")).toBeVisible({ timeout: 20_000 });
    await loadMoreButton.press("Enter");
    await expect(addDialog.getByText("photo-51")).toBeVisible({ timeout: 20_000 });

    await addDialog.getByText("photo-51").click();
    await expect(page.getByRole("button", { name: "添加 1" })).toBeEnabled();
    await page.getByRole("button", { name: "添加 1" }).click();
    await expect(addDialog).toHaveCount(0);
    await expect(page.getByText("photo-51")).toBeVisible({ timeout: 20_000 });

    const gallerySearch = page.getByPlaceholder("搜索名称或原始文件名");
    await gallerySearch.fill("missing-" + uniqueId);
    await expect(page.getByRole("heading", { name: "没有找到匹配的照片" })).toBeVisible();
    const gallerySearchSection = page.locator("section").filter({ hasText: "PHOTOS" });
    await expect(gallerySearchSection.getByLabel("清空搜索")).toBeVisible();
    await gallerySearchSection.getByLabel("清空搜索").click();
    await expect(gallerySearch).toHaveValue("");
    await expect(page.getByText("photo-51")).toBeVisible();

    const photoCard = page.locator("article").filter({ hasText: "photo-51" }).first();
    await photoCard.getByRole("button", { name: "更多操作" }).click({ force: true });
    await page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("menuitem", { name: "删除" }).click();
    await expect(page.locator("article").filter({ hasText: "photo-51" })).toHaveCount(0, {
      timeout: 20_000,
    });

    await page.getByRole("button", { name: "管理" }).click();
    const updatedAlbumName = `${targetAlbumName} 更新`;
    const manageDialog = page.getByRole("dialog", { name: "管理相册" });
    const nameInput = manageDialog.getByRole("textbox").first();
    await nameInput.fill(updatedAlbumName);
    await page.route(`**/api/albums/${targetAlbumId}`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "保存失败，请稍后重试" }),
      });
    });
    await page.getByRole("button", { name: "保存资料" }).click();
    await expect(manageDialog.getByRole("alert")).toContainText("保存失败，请稍后重试");
    await expect(nameInput).toHaveValue(updatedAlbumName);
    await expect(page.getByRole("heading", { name: targetAlbumName })).toBeVisible();
    await expect(page.getByRole("button", { name: "从全部照片添加" })).toBeVisible();
  });
});
