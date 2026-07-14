import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlobalUploadDialog } from "@/components/upload/global-upload-dialog";

describe("GlobalUploadDialog", () => {
  it("renders the selected upload target and upload form", () => {
    const html = renderToStaticMarkup(
      createElement(GlobalUploadDialog, {
        open: true,
        albums: [
          {
            id: "album-1",
            name: "全部照片",
            description: "所有上传的照片",
            isDefault: true,
            canUpload: true,
          },
          {
            id: "album-2",
            name: "家庭相册",
            description: "周末整理",
            isDefault: false,
            canUpload: true,
          },
        ],
        loadingAlbums: false,
        loadError: null,
        search: "",
        selectedAlbumId: "album-2",
        showCreateAlbum: false,
        createAlbumName: "",
        createAlbumDescription: "",
        creatingAlbum: false,
        onClose: () => undefined,
        onSearchChange: () => undefined,
        onSelectAlbum: () => undefined,
        onOpenCreateAlbum: () => undefined,
        onCreateAlbumClose: () => undefined,
        onCreateAlbumNameChange: () => undefined,
        onCreateAlbumDescriptionChange: () => undefined,
        onCreateAlbum: () => undefined,
      }),
    );

    expect(html).toContain("上传照片");
    expect(html).toContain("目标相册");
    expect(html).toContain("家庭相册");
    expect(html).toContain("所有上传的照片");
    expect(html).toContain("选择图片/视频");
  });
});
