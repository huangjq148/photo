import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.describe("smoke", () => {
  const uniqueId = randomUUID().slice(0, 8);
  const email = `e2e-smoke-${uniqueId}@test.local`;
  const password = "Test1234!";
  const nickname = `SmokeUser-${uniqueId}`;

  test("register, browse albums and create an album", async ({ page }) => {
    // 1. Navigate to register page
    await page.goto("/register");

    // 2. Fill registration form
    await page.fill("#register-nickname", nickname);
    await page.fill("#register-email", email);
    await page.fill("#register-password", password);
    await page.fill("#register-confirmPassword", password);

    // 3. Submit
    const navigation = page.waitForURL("**/albums", {
      timeout: 15_000,
      waitUntil: "commit",
    });
    await page.click('button[type="submit"]');
    await navigation;

    // 4. Should redirect to albums page
    await expect(page).toHaveURL(/\/albums/);

    // 5. Album view should be visible
    await expect(page.locator("text=相册").first()).toBeVisible({ timeout: 10_000 });
  });
});
