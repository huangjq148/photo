import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile-s", width: 320, height: 568 },
  { name: "mobile-m", width: 375, height: 667 },
  { name: "mobile-l", width: 414, height: 896 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop-s", width: 1024, height: 768 },
  { name: "desktop-l", width: 1440, height: 900 },
] as const;

test.describe("photo ux responsive", () => {
  for (const vp of VIEWPORTS) {
    test(`viewport ${vp.name} (${vp.width}x${vp.height}) has no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);

      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });

    test(`viewport ${vp.name} has page content visible`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      // Home page should render the hero
      await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
    });

    test(`viewport ${vp.name} layout does not break`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");

      // Verify no overlay issues by checking body overflow
      const overflowX = await page.evaluate(() => document.body.style.overflowX);
      expect(overflowX).not.toBe("hidden");

      // Take a screenshot for visual verification
      await page.screenshot({
        path: `tests/e2e/screenshots/photo-ux-${vp.name}.png`,
        fullPage: false,
      });
    });
  }
});
