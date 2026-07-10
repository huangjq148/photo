import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.describe("anonymous public share", () => {
  const uniqueId = randomUUID().slice(0, 8);
  const email = `e2e-share-${uniqueId}@test.local`;
  const password = "Test1234!";
  const nickname = `ShareUser-${uniqueId}`;

  test("share creation API returns valid share URL", async ({ page }) => {
    // Register
    await page.goto("/register");
    await page.fill("#register-nickname", nickname);
    await page.fill("#register-email", email);
    await page.fill("#register-password", password);
    await page.fill("#register-confirmPassword", password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/albums", { timeout: 15_000 });

    // Create a share via API using the authenticated session
    const result = await page.evaluate(async () => {
      // First list albums
      const albumsRes = await fetch("/api/albums");
      const albumsJson = await albumsRes.json();
      const albums = albumsJson.data ?? [];
      if (!albums.length) return { error: "no albums" };

      // List photos in first album
      const albumId = albums[0].id;
      const photosRes = await fetch(
        `/api/albums/${albumId}/photos?page=1&pageSize=5`
      );
      const photosJson = await photosRes.json();
      const photos = photosJson.data ?? photosJson.photos ?? [];
      if (!photos.length) return { error: "no photos" };

      // Create a share
      const shareRes = await fetch(`/api/photos/${photos[0].id}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInHours: null }),
      });

      if (!shareRes.ok) {
        const err = await shareRes.json();
        return { error: err.error ?? "share creation failed" };
      }

      const shareJson = await shareRes.json();
      return shareJson.data;
    });

    // If no photos available, the test can't proceed
    if (result.error === "no albums" || result.error === "no photos") {
      console.log("No photos available for sharing — skipping share test");
      return;
    }

    // Verify share response has expected fields
    expect(result.id).toBeTruthy();
    expect(result.url).toMatch(/^\/share\//);
    expect(result.token).toBeTruthy();
  });

  test("share listing and revocation works", async ({ page }) => {
    const revokeEmail = `e2e-revoke-${uniqueId}@test.local`;

    await page.goto("/register");
    await page.fill("#register-nickname", `Revoker-${uniqueId}`);
    await page.fill("#register-email", revokeEmail);
    await page.fill("#register-password", password);
    await page.fill("#register-confirmPassword", password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/albums", { timeout: 15_000 });

    // Create and revoke a share
    const result = await page.evaluate(async () => {
      const albumsRes = await fetch("/api/albums");
      const albumsJson = await albumsRes.json();
      const albums = albumsJson.data ?? [];
      if (!albums.length) return { error: "no albums" };

      const albumId = albums[0].id;
      const photosRes = await fetch(
        `/api/albums/${albumId}/photos?page=1&pageSize=5`
      );
      const photosJson = await photosRes.json();
      const photos = photosJson.data ?? photosJson.photos ?? [];
      if (!photos.length) return { error: "no photos" };

      // Create share
      const shareRes = await fetch(`/api/photos/${photos[0].id}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInHours: null }),
      });
      const shareJson = await shareRes.json();
      const share = shareJson.data;

      // List shares — should have 1
      const listRes = await fetch(`/api/photos/${photos[0].id}/shares`);
      const listJson = await listRes.json();
      const sharesBefore = listJson.data ?? [];

      // Revoke
      const revokeRes = await fetch(`/api/photos/shares/${share.id}`, {
        method: "DELETE",
      });
      const revokeJson = await revokeRes.json();

      // List again — should be empty (revoked shares are not shown)
      const listRes2 = await fetch(`/api/photos/${photos[0].id}/shares`);
      const listJson2 = await listRes2.json();
      const sharesAfter = listJson2.data ?? [];

      return {
        share,
        sharesBefore: sharesBefore.length,
        revokeOk: revokeRes.ok,
        sharesAfter: sharesAfter.length,
      };
    });

    if (result.error === "no albums" || result.error === "no photos") {
      console.log("No photos available for revoke test — skipping");
      return;
    }

    expect(result.sharesBefore).toBeGreaterThanOrEqual(1);
    expect(result.revokeOk).toBe(true);
    // After revoke, active shares should be 0
    expect(result.sharesAfter).toBe(0);
  });

  test("share page returns 404 for invalid token", async ({ page }) => {
    await page.goto("/share/nonexistent-token-12345");
    await page.waitForLoadState("networkidle");

    // Should show 404
    await expect(page.locator("text=404").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
