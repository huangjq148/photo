import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AlbumDetailHeader } from "@/components/albums/album-detail-header";
import { AlbumDetailPageError } from "@/components/albums/album-detail";

describe("AlbumDetailHeader", () => {
  it("keeps album metadata behind a compact mobile info menu", () => {
    const html = renderToStaticMarkup(
      createElement(AlbumDetailHeader, {
        album: {
          name: "家庭相册",
          description: "周末整理",
          isDefault: false,
          photoCount: 18,
          memberCount: 3,
          role: "owner",
        },
        onUploadNew: () => undefined,
        onAddFromAllPhotos: () => undefined,
        onManage: () => undefined,
        onShare: () => undefined,
      }),
    );

    expect(html).toContain("家庭相册");
    expect(html).toContain("周末整理");
    expect(html).toContain("18 张照片");
    expect(html).toContain("3 位成员");
    expect(html).toContain('aria-label="相册信息"');
    expect(html).toContain("上传新照片");
    expect(html).toContain("从全部照片添加");
    expect(html).toContain("管理");
    expect(html).toContain("公开分享");
    expect(html).toContain("sm:hidden");
    expect(html).toContain("hidden sm:flex");
    expect(html).toContain('aria-label="从全部照片添加"');
    expect(html).toContain('aria-label="更多相册操作"');
    expect(html).toMatch(
      /<button(?=[^>]*aria-label="从全部照片添加")(?=[^>]*class="[^"]*\bh-11\b)(?=[^>]*class="[^"]*\bw-11\b)[^>]*>/,
    );
    expect(html).toMatch(
      /<button(?=[^>]*aria-label="更多相册操作")(?=[^>]*class="[^"]*\bh-11\b)(?=[^>]*class="[^"]*\bw-11\b)[^>]*>/,
    );
    expect(html).not.toContain("邀请");
    expect(html).toContain("text-3xl");
    expect(html).not.toContain("sm:text-6xl");
  });

  it("labels the default album as default instead of repeating the title", () => {
    const html = renderToStaticMarkup(
      createElement(AlbumDetailHeader, {
        album: {
          name: "全部照片",
          description: null,
          isDefault: true,
          photoCount: 18,
          memberCount: 3,
          role: "member",
        },
        onUploadNew: () => undefined,
        onAddFromAllPhotos: () => undefined,
        onManage: () => undefined,
        onShare: () => undefined,
      }),
    );

    expect(html).toContain("全部照片");
    expect(html).toContain("默认相册");
    expect(html).not.toContain(">全部照片</span>");
  });

  it("shows a reload action when the album page fails to load", () => {
    const html = renderToStaticMarkup(
      createElement(AlbumDetailPageError, {
        error: "相册加载失败",
        onReload: () => undefined,
      }),
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("相册加载失败");
    expect(html).toContain("重新加载相册");
  });
});
