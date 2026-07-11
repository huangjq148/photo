import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AddPhotoToAlbumModal } from "@/components/albums/add-photo-to-album-modal";
import { MessageProvider } from "@/components/ui/message";

describe("AddPhotoToAlbumModal", () => {
  it("renders the shared dialog shell for album selection", () => {
    const html = renderToStaticMarkup(
      createElement(
        MessageProvider,
        null,
        createElement(AddPhotoToAlbumModal, {
          open: true,
          currentAlbumId: "album-current",
          photoId: "photo-1",
          photoName: "家庭照.jpg",
          onClose: () => undefined,
          onAdded: () => undefined,
        }),
      ),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain("添加到相册");
    expect(html).toContain("选择一个相册，把这张照片添加进去。");
    expect(html).toContain("加载相册...");
  });
});
