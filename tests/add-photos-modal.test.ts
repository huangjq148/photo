import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  AddPhotosModal,
  buildAddPhotosRequestUrl,
  reconcileFailedSelection,
} from "@/components/albums/add-photos-modal";
import { MessageProvider } from "@/components/ui/message";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => undefined }),
  usePathname: () => "/albums/album-1",
  useSearchParams: () => new URLSearchParams(),
}));

describe("AddPhotosModal", () => {
  it("renders search, pagination and a fixed footer for cross-page selection", () => {
    const html = renderToStaticMarkup(
      createElement(
        MessageProvider,
        null,
        createElement(AddPhotosModal, {
          open: true,
          currentAlbumId: "album-1",
          onClose: () => undefined,
          onAdded: () => undefined,
        }),
      ),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("从全部照片中添加");
    expect(html).toContain("选择要添加到当前相册的照片");
    expect(html).toContain("搜索");
    expect(html).toContain("加载更多");
    expect(html).toContain("点击照片选择");
  });

  it("builds request urls against the default album and excludes items already in the target album", () => {
    expect(
      buildAddPhotosRequestUrl({
        albumId: "default-1",
        currentAlbumId: "target-1",
        pageSize: 100,
        cursor: "cursor-1",
        query: "海边",
      }),
    ).toBe(
      "/api/albums/default-1/photos?pageSize=100&excludeAlbumId=target-1&keyword=%E6%B5%B7%E8%BE%B9&cursor=cursor-1",
    );
  });

  it("keeps only failed selections after submission", () => {
    expect(
      reconcileFailedSelection(new Set(["photo-1", "photo-2", "photo-3"]), {
        succeededIds: ["photo-1"],
        failed: [{ id: "photo-3", code: "FORBIDDEN", message: "无权访问" }],
      }),
    ).toEqual(["photo-3"]);
  });
});
