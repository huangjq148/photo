import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeHero } from "@/components/home/home-hero";
import { getAuthenticatedRedirectPath } from "@/lib/auth/redirects";

describe("auth navigation", () => {
  it("shows 进入相册 CTA for authenticated users on home", () => {
    const html = renderToStaticMarkup(createElement(HomeHero, { user: { nickname: "test" } }));

    expect(html).not.toContain('href="/login"');
    expect(html).toContain('href="/albums"');
    expect(html).toContain("进入相册");
  });

  it("shows 今天的回忆 entry for authenticated users on home", () => {
    const html = renderToStaticMarkup(
      createElement(HomeHero, {
        user: { nickname: "test" },
        memorySpotlight: {
          title: "7月12日 · 往年今日",
          items: [
            {
              id: "photo-1",
              albumId: "album-1",
              albumName: "家庭相册",
              displayName: "海边",
              originalName: "beach.jpg",
              thumbnailUrl: "/thumb.jpg",
              previewUrl: "/preview.jpg",
              originalUrl: "/original.jpg",
              mimeType: "image/jpeg",
              mediaType: "image",
              takenAt: null,
              uploadedAt: "2026-07-12T00:00:00.000Z",
              effectiveAt: "2026-07-12T00:00:00.000Z",
              isFavorited: false,
            },
          ],
        },
      })
    );

    expect(html).toContain("今天的回忆");
    expect(html).toContain('href="/memory"');
    expect(html).toContain("7月12日 · 往年今日");
  });

  it("keeps the login CTA on the home page for guests", () => {
    const html = renderToStaticMarkup(createElement(HomeHero, { user: null }));

    expect(html).toContain('href="/login"');
    expect(html).toContain("登录");
    expect(html).toContain('href="/register"');
    expect(html).toContain("注册");
  });

  it("redirects authenticated users to /albums", () => {
    expect(getAuthenticatedRedirectPath(true)).toBe("/albums");
    expect(getAuthenticatedRedirectPath(false)).toBeNull();
  });
});
