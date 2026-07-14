import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AlbumDetailHeader } from "@/components/albums/album-detail-header";

describe("AlbumDetailHeader", () => {
  it("keeps the album detail page focused on photos with one primary action", () => {
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
    expect(html).toContain("上传新照片");
    expect(html).toContain("从全部照片添加");
    expect(html).toContain("管理");
    expect(html).not.toContain("邀请");
    expect(html).toContain("text-3xl");
    expect(html).not.toContain("sm:text-6xl");
  });
});
